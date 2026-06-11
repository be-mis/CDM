/**
 * Diagnostic Script: Check Liquidation Alert Status
 * Usage: node check-liquidation-status.js
 * 
 * This script checks:
 * 1. Your cash advances
 * 2. Their current status
 * 3. Liquidation deadlines
 * 4. Any existing liquidations
 * 5. Why alerts may or may not be triggered
 */

require('dotenv').config();
const db = require('./src/config/db');

async function checkStatus() {
  let connection;
  try {
    connection = await db.getConnection();

    const userEmail = 'roland.alavera@barbizonfashion.com';
    console.log('\n' + '='.repeat(70));
    console.log('LIQUIDATION ALERT STATUS CHECK');
    console.log('User: ' + userEmail);
    console.log('Current Date: ' + new Date().toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    }));
    console.log('='.repeat(70) + '\n');

    // Find user
    const [users] = await connection.query(
      'SELECT id, email, name FROM users WHERE email = ?',
      [userEmail]
    );

    if (users.length === 0) {
      console.log('❌ No user found with email:', userEmail);
      connection.release();
      return;
    }

    const user = users[0];
    console.log('✓ User Found:');
    console.log(`  ID: ${user.id}`);
    console.log(`  Name: ${user.name}`);
    console.log(`  Email: ${user.email}\n`);

    // Get all cash advances for this user
    const [cashAdvances] = await connection.query(`
      SELECT 
        id,
        advance_number,
        status,
        requested_amount,
        purpose,
        liquidation_deadline,
        created_by,
        alert_sent_at,
        created_at,
        DATEDIFF(CURDATE(), liquidation_deadline) as days_overdue
      FROM cash_advances
      WHERE created_by = ? OR employee_id = ?
      ORDER BY created_at DESC
    `, [userEmail, user.id]);

    if (cashAdvances.length === 0) {
      console.log('❌ No cash advances found for this user\n');
      connection.release();
      return;
    }

    console.log(`✓ Cash Advances Found: ${cashAdvances.length}\n`);
    console.log('-'.repeat(70));

    for (const ca of cashAdvances) {
      console.log(`\n📋 CA #${ca.advance_number}`);
      console.log(`   ID: ${ca.id}`);
      console.log(`   Amount: ₱${ca.requested_amount ? parseFloat(ca.requested_amount).toLocaleString('en-PH', { minimumFractionDigits: 2 }) : 'N/A'}`);
      console.log(`   Purpose: ${ca.purpose || 'N/A'}`);
      console.log(`   Status: ${ca.status}`);
      console.log(`   Created: ${new Date(ca.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`);
      
      if (ca.liquidation_deadline) {
        const deadline = new Date(ca.liquidation_deadline);
        const today = new Date();
        const isOverdue = deadline <= today;
        
        console.log(`   Liquidation Deadline: ${deadline.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`);
        
        if (isOverdue) {
          console.log(`   ⚠️  STATUS: OVERDUE by ${ca.days_overdue} day(s)`);
        } else {
          console.log(`   ✓ Not yet due (${Math.abs(ca.days_overdue)} day(s) remaining)`);
        }
      } else {
        console.log(`   Liquidation Deadline: NOT SET`);
      }

      if (ca.alert_sent_at) {
        console.log(`   Last Alert Sent: ${new Date(ca.alert_sent_at).toLocaleString('en-US')}`);
      } else {
        console.log(`   Last Alert Sent: NONE`);
      }

      // Check for existing liquidations
      const [liquidations] = await connection.query(`
        SELECT 
          id,
          liquidation_number,
          status,
          created_at
        FROM liquidations
        WHERE cash_advance_id = ?
      `, [ca.id]);

      if (liquidations.length > 0) {
        console.log(`   Liquidations: ${liquidations.length}`);
        for (const liq of liquidations) {
          console.log(`     - ${liq.liq_number} [${liq.status}] (${new Date(liq.created_at).toLocaleDateString('en-US')})`);
        }
      } else {
        console.log(`   Liquidations: NONE`);
      }

      // Check alert eligibility
      console.log(`\n   🔍 Alert Eligibility Check:`);
      const eligibilityIssues = [];

      if (ca.status !== 'released' && ca.status !== 'disbursed') {
        eligibilityIssues.push(`Status is '${ca.status}' (must be 'released' or 'disbursed')`);
      } else {
        console.log(`   ✓ Status is eligible (${ca.status})`);
      }

      if (!ca.liquidation_deadline) {
        eligibilityIssues.push('Liquidation deadline is NOT SET');
      } else if (ca.liquidation_deadline > new Date().toISOString().split('T')[0]) {
        eligibilityIssues.push(`Deadline hasn't passed yet (${new Date(ca.liquidation_deadline).toLocaleDateString()})`);
      } else {
        console.log(`   ✓ Deadline has passed`);
      }

      if (liquidations.length > 0) {
        const blockingStatuses = ['draft', 'pending', 'approved', 'disbursed', 'liquidated'];
        const hasBlocking = liquidations.some(l => blockingStatuses.includes(l.status));
        if (hasBlocking) {
          eligibilityIssues.push('Existing liquidation in blocking status prevents alert');
        }
      } else {
        console.log(`   ✓ No blocking liquidations`);
      }

      if (eligibilityIssues.length === 0) {
        console.log(`   ✅ THIS CA IS ELIGIBLE FOR ALERTS`);
      } else {
        console.log(`   ❌ NOT ELIGIBLE - Reasons:`);
        eligibilityIssues.forEach(issue => {
          console.log(`      • ${issue}`);
        });
      }
    }

    console.log('\n' + '='.repeat(70));
    console.log('SUMMARY');
    console.log('='.repeat(70));

    const eligibleCAs = cashAdvances.filter(ca => {
      const isReleasedStatus = ca.status === 'released' || ca.status === 'disbursed';
      const deadline = ca.liquidation_deadline;
      const isOverdue = deadline && new Date(deadline) <= new Date();
      
      return isReleasedStatus && isOverdue;
    });

    if (eligibleCAs.length === 0) {
      console.log('\n✓ No released cash advances are overdue');
      console.log('\nPossible reasons for no alert:');
      console.log('1. All cash advances status ≠ "released" or "disbursed"');
      console.log('2. Liquidation deadlines not yet passed');
      console.log('3. Liquidation already submitted (even if draft)');
      console.log('4. This is the first day after server restart (alert already sent today)');
    } else {
      console.log(`\n⚠️  ${eligibleCAs.length} CA(s) are eligible for liquidation alerts`);
      console.log('\nIf you still didn\'t receive emails, check:');
      console.log('1. Email configuration in .env file');
      console.log('2. SMTP settings and credentials');
      console.log('3. Email service logs');
      console.log('4. Spam folder in email account');
    }

    console.log('\n' + '='.repeat(70) + '\n');

  } catch (error) {
    console.error('❌ Database Error:', error.message);
    console.error(error);
  } finally {
    if (connection) connection.release();
    process.exit(0);
  }
}

checkStatus();
