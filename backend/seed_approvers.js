const mysql = require('mysql2/promise');
require('dotenv').config();

const approverData = [
    { name: 'Marle Cua-Chin', email: 'marle.cua-chin@barbizonfashion.com', department: 'MIS' },
    { name: 'Marle Cua-Chin', email: 'smarle.cua-chin@barbizonfashion.com', department: 'MIS' },
    { name: 'Reden Cuevas', email: 'sred.cuevas@barbizonfashion.com', department: 'NBFI Sales' },
    { name: 'Reden Cuevas', email: 'reden.cuevas@barbizonfashion.com', department: 'NBFI Sales' },
    { name: 'Reden Cuevas', email: 'sred.cuevas@barbizonfashion.com', department: 'NBFI Merchandising' },
    { name: 'Reden Cuevas', email: 'reden.cuevas@barbizonfashion.com', department: 'NBFI Merchandising' },
    { name: 'Karla Brecio', email: 'skarla.brecio@everydayproductscorp.com', department: 'EPC Sales' },
    { name: 'Karla Brecio', email: 'karla.brecio@everydayproductscorp.com', department: 'EPC Sales' },
    { name: 'Renalen Echano', email: 'srenalen.echano@everydayproductscorp.com', department: 'EPC Sales' },
    { name: 'Renalen Echano', email: 'renalen.echano@everydayproductscorp.com', department: 'EPC Sales' },
    { name: 'Karla Brecio', email: 'skarla.brecio@everydayproductscorp.com', department: 'EPC Merchandising' },
    { name: 'Karla Brecio', email: 'karla.brecio@everydayproductscorp.com', department: 'EPC Merchandising' },
    { name: 'Irish Manaois', email: 'sirish.manaois@barbizonfashion.com', department: 'Finance' },
    { name: 'Irish Manaois', email: 'irish.manaois@barbizonfashion.com', department: 'Finance' },
    { name: 'Mirare Alforja', email: 'smirare.alforja@everydayproductscorp.com', department: 'Finance' },
    { name: 'Mirare Alforja', email: 'mirare.alforja@everydayproductscorp.com', department: 'Finance' },
    { name: 'Nhoreyn Abejero', email: 'snhoreyn.abejero@everydayproductscorp.com', department: 'Human Resource' },
    { name: 'Nhoreyn Abejero', email: 'nhoreyn.abejero@everydayproductscorp.com', department: 'Human Resource' },
    { name: 'Reden Cuevas', email: 'sred.cuevas@barbizonfashion.com', department: 'Marketing' },
    { name: 'Reden Cuevas', email: 'reden.cuevas@barbizonfashion.com', department: 'Marketing' },
    { name: 'Dang Cabrera', email: 'sdang.cabrera@barbizonfashion.com', department: 'Operations' },
    { name: 'Dang Cabrera', email: 'dang.cabrera@barbizonfashion.com', department: 'Operations' },
    // Keep the user's gmail for testing if they want
    { name: 'Approver Test', email: 'bloodykill02@gmail.com', department: 'MIS' }
];

async function seed() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'cdmdb'
    });

    console.log('Seeding approver table with multiple email variants...');

    try {
        await connection.query('TRUNCATE TABLE approver');

        for (const approver of approverData) {
            await connection.query(
                'INSERT INTO approver (name, email, department) VALUES (?, ?, ?)',
                [approver.name, approver.email, approver.department]
            );
        }

        console.log(`Seeding complete. Added ${approverData.length} entries.`);
    } catch (error) {
        console.error('Error seeding data:', error);
    } finally {
        await connection.end();
    }
}

seed();
