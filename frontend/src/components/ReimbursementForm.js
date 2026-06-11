// import React, { useState, useEffect } from 'react';
// import { useNavigate } from 'react-router-dom';
// import { Save, Send, RotateCcw } from 'lucide-react';
// import api from '../api';
// import { useAuth } from '../context/AuthContext';
// import ItemsTable from './forms/ItemsTable';
// import AttachmentsSection from './forms/AttachmentsSection';
// import PaymentDetailsSection from './forms/PaymentDetailsSection';
// import ItinerarySheet from './forms/ItinerarySheet';
// import { formatNumber, sanitizeNumberInput, normalizeDate, formatLongDate } from '../utils/formatters';
// import Button from './ui/Button';
// import Input from './ui/Input';
// import { Card, CardContent } from './ui/Card';
// import { Alert, InlineAlert } from './ui/Alert';

// const TruncatedViewField = ({ value, label }) => (
//     <div className="relative w-full">
//         {label && (
//             <span className="absolute -top-2 left-3 bg-white px-1 text-xs text-gray-600 z-10">
//                 {label}
//             </span>
//         )}
//         <div className="px-4 py-2 border border-gray-200 rounded-lg bg-gray-50 whitespace-nowrap overflow-hidden text-ellipsis w-full text-sm text-gray-900 min-h-[35px] flex items-center" title={value || ''}>
//             {value || '-'}
//         </div>
//     </div>
// );

// const ReimbursementForm = (props) => {
//     const { editData, onClose, viewOnly = false, hideCloseButton = false } = props || {};
//     const { user } = useAuth();
//     const navigate = useNavigate();
//     const [userPaymentInfo, setUserPaymentInfo] = useState(null);

//     const [formData, setFormData] = useState(() => {
//         if (editData) {
//             return {
//                 reimbursementNumber: editData.reimbursementNumber || editData.reimbursement_number || '',
//                 reimbursementDate: normalizeDate(editData.reimbursementDate || editData.reimbursement_date) || new Date().toISOString().split('T')[0],
//                 requestedBy: editData.requestedBy || user?.name || '',
//                 department: editData.department || user?.department || '',
//                 departmentName: editData.departmentName || editData.department_name || editData.department || '',
//                 employeeId: editData.employeeId || '',
//                 businessUnit: editData.businessUnit || editData.business_unit || 'EPC',
//                 purpose: editData.purpose || '',
//                 periodCoveredFrom: normalizeDate(editData.periodCoveredFrom || editData.period_covered_from || '') || '',
//                 periodCoveredTo: normalizeDate(editData.periodCoveredTo || editData.period_covered_to || '') || '',
//                 paymentMethod: editData.paymentMethod || editData.payment_method || 'payroll',
//                 gcashName: editData.gcashName || editData.gcash_name || editData.paymentReason || '',
//                 checkNumber: editData.checkNumber || editData.check_number || '',
//                 accountNumber: editData.accountNumber || editData.account_number || '',
//                 remarks: editData.remarks || '',
//                 status: editData.status || 'draft',
//             };
//         }
//         return {
//             reimbursementNumber: '',
//             reimbursementDate: new Date().toISOString().split('T')[0],
//             requestedBy: user?.name || '',
//             department: user?.department || '',
//             employeeId: '',
//             businessUnit: 'EPC',
//             purpose: '',
//             periodCoveredFrom: '',
//             periodCoveredTo: '',
//             paymentMethod: 'payroll',
//             gcashName: '',
//             checkNumber: '',
//             accountNumber: '',
//             remarks: '',
//             status: 'draft',
//         };
//     });

//     const [items, setItems] = useState(() => {
//         if (editData?.items?.length) {
//             return editData.items.map((it, idx) => ({
//                 id: it.id || idx + 1,
//                 expenseDate: normalizeDate(it.expenseDate || it.expense_date || ''),
//                 description: it.description || it.particulars || '',
//                 estimatedAmount: parseFloat(it.estimatedAmount || it.estimated_amount || it.amount || 0),
//                 tin: it.tin || it.tim || it.receiptNumber || it.receipt_number || '',
//                 vendor: it.vendor || '',
//                 address: it.address || '',
//                 accountCode: it.accountCode || it.account_code || ''
//             }));
//         }
//         return [{ id: 1, expenseDate: '', description: '', estimatedAmount: 0, tin: '', vendor: '', address: '', accountCode: '' }];
//     });

//     const [itinerary, setItinerary] = useState(() => {
//         if (editData?.transportation?.length) {
//             return editData.transportation.map((t, idx) => ({
//                 id: t.id || idx + 1,
//                 dateCovered: normalizeDate(t.dateCovered || t.date_covered || ''),
//                 store: t.store || '',
//                 fromLocation: t.fromLocation || t.from_location || '',
//                 toLocation: t.toLocation || t.to_location || '',
//                 modeOfTransport: t.modeOfTransport || t.mode_of_transport || '',
//                 amount: parseFloat(t.amount || 0)
//             }));
//         }
//         return [];
//     });

//     const [departments, setDepartments] = useState([]);
//     const [attachments, setAttachments] = useState([]);
//     const [pendingDeletes, setPendingDeletes] = useState([]);
//     const [notification, setNotification] = useState(null);
//     const [errors, setErrors] = useState({});

//     useEffect(() => {
//         fetchDepartments();
//         if (!editData) generateReimbursementNumber();
//         if (editData?.attachments?.length) {
//             setAttachments(editData.attachments.map(att => ({
//                 id: att.id,
//                 fileName: att.fileName || att.file_name,
//                 filePath: att.filePath || att.file_path,
//                 fileType: att.fileType || att.file_type,
//                 fileSize: att.fileSize || att.file_size,
//                 isExisting: true
//             })));
//         }
//     }, [editData]);

//     // Fetch user payment information on mount
//     useEffect(() => {
//         const fetchUserPaymentInfo = async () => {
//             try {
//                 const response = await api.get('/auth/profile');
//                 if (response.data?.user) {
//                     setUserPaymentInfo({
//                         payrollAccount: response.data.user.payroll_account,
//                         gcashNumber: response.data.user.gcash_number,
//                         gcashName: response.data.user.gcash_name
//                     });
//                 }
//             } catch (err) {
//                 console.error('Failed to fetch user payment info:', err);
//             }
//         };
//         fetchUserPaymentInfo();
//     }, []);

//     // Auto-populate payment details when payment method changes
//     useEffect(() => {
//         if (!userPaymentInfo || viewOnly) return;

//         setFormData(p => {
//             if (p.paymentMethod === 'payroll') {
//                 return { ...p, accountNumber: userPaymentInfo.payrollAccount || '', gcashName: '' };
//             } else if (p.paymentMethod === 'gcash') {
//                 return { ...p, accountNumber: userPaymentInfo.gcashNumber || '', gcashName: userPaymentInfo.gcashName || '' };
//             }
//             return p;
//         });
//     }, [formData.paymentMethod, userPaymentInfo, viewOnly]);

//     const fetchDepartments = async () => {
//         try {
//             const res = await api.get('/departments');
//             if (res.data) setDepartments(Array.isArray(res.data) ? res.data : (res.data.departments || []));
//         } catch (e) {
//             setDepartments([{ id: 1, name: 'Finance' }, { id: 2, name: 'Operations' }]);
//         }
//     };

//     const generateReimbursementNumber = () => {
//         const date = new Date();
//         const year = date.getFullYear();
//         const month = String(date.getMonth() + 1).padStart(2, '0');
//         const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
//         setFormData(prev => ({ ...prev, reimbursementNumber: `RMB-${year}${month}-${random}` }));
//     };

//     const handleInputChange = (e) => setFormData(p => ({ ...p, [e.target.name]: e.target.value }));

//     const calculateTotal = () => {
//         const itemsTotal = items.reduce((sum, item) => sum + (parseFloat(item.estimatedAmount) || 0), 0);
//         const itineraryTotal = itinerary.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
//         return itemsTotal + itineraryTotal;
//     };

//     const handleItemChange = (id, field, value, cursorPos) => {
//         setItems(p => p.map(it => it.id === id ? { ...it, [field]: value } : it));
//         if (cursorPos !== undefined && field === 'estimatedAmount') {
//             setTimeout(() => {
//                 const i = document.querySelector(`input[data-item-id="${id}"][data-field="${field}"]`);
//                 if (i) i.setSelectionRange(cursorPos, cursorPos);
//             }, 0);
//         }
//     };

//     const handleItineraryChange = (index, field, value) => {
//         setItinerary(prev => prev.map((item, i) =>
//             i === index ? { ...item, [field]: value } : item
//         ));
//     };

//     const addItineraryRow = () => {
//         setItinerary(prev => [...prev, {
//             id: Date.now(),
//             dateCovered: '',
//             store: '',
//             fromLocation: '',
//             toLocation: '',
//             modeOfTransport: '',
//             amount: 0
//         }]);
//     };

//     const removeItineraryRow = (id) => {
//         setItinerary(prev => prev.filter(item => item.id !== id));
//     };

//     const validateForm = () => {
//         const errs = {};
//         if (!formData.purpose?.trim()) errs.purpose = 'Purpose required';
//         if (!formData.department) errs.department = 'Department required';
//         if (calculateTotal() === 0) errs.total = 'Total amount must be > 0';

//         if (formData.paymentMethod === 'gcash') {
//             if (!formData.gcashName?.toString().trim()) errs.gcashName = 'Name required';
//             if (!formData.accountNumber?.toString().trim()) errs.accountNumber = 'Account number required';
//         } else if (['payroll', 'bank_transfer'].includes(formData.paymentMethod) && !formData.accountNumber?.toString().trim()) {
//             errs.accountNumber = 'Account number required';
//         }
//         setErrors(errs);
//         return { isValid: Object.keys(errs).length === 0, errors: errs };
//     };

//     const handleSaveDraft = async () => {
//         if (!formData.purpose?.trim() && calculateTotal() === 0) {
//             return showNotification('Provide at least a purpose or an amount to save as draft', 'warning');
//         }
//         try {
//             const payload = { ...formData, items, transportation: itinerary, totalAmount: calculateTotal(), status: 'draft' };
//             let res;
//             if (editData?.id) {
//                 res = await api.put(`/reimbursements/${editData.id}`, payload);
//             } else {
//                 res = await api.post('/reimbursements', payload);
//             }

//             if (res.data.success) {
//                 const requestId = editData?.id || res.data.data.id;
//                 if (attachments.length > 0) await uploadAttachments(requestId);
//                 showNotification('Draft saved!');
//                 onClose ? onClose() : navigate('/my-requests', { state: { tab: 0 } });
//             }
//         } catch (e) { showNotification('Save failed', 'error'); }
//     };

//     const handleSubmit = async () => {
//         const { isValid, errors: validationErrors } = validateForm();
//         if (!isValid) {
//             const fieldLabels = {
//                 purpose: 'Purpose',
//                 department: 'Department',
//                 total: 'Amount/Items'
//             };
//             const missing = Object.keys(validationErrors).map(k => fieldLabels[k] || k);
//             return showNotification(`Please fill in required fields: ${missing.join(', ')}`, 'error');
//         }
//         try {
//             const payload = { ...formData, items, transportation: itinerary, totalAmount: calculateTotal(), status: 'pending' };
//             let res;
//             if (editData?.id) {
//                 res = await api.put(`/reimbursements/${editData.id}`, payload);
//             } else {
//                 res = await api.post('/reimbursements', payload);
//             }

//             if (res.data.success) {
//                 const requestId = editData?.id || res.data.data.id;
//                 if (attachments.length > 0) await uploadAttachments(requestId);
//                 showNotification('Submitted successfully!');
//                 onClose ? onClose() : navigate('/my-requests', { state: { tab: 0 } });
//             }
//         } catch (e) { showNotification('Submit failed', 'error'); }
//     };

//     const uploadAttachments = async (id) => {
//         // Process deletions
//         if (pendingDeletes.length > 0) {
//             for (const attachmentId of pendingDeletes) {
//                 try {
//                     await api.delete(`/reimbursements/${id}/attachments/${attachmentId}`);
//                 } catch (e) {
//                     console.error(`Failed to delete attachment ${attachmentId}`, e);
//                 }
//             }
//         }

//         // Process new uploads
//         for (const file of attachments) {
//             if (file.isExisting) continue;
//             const fd = new FormData();
//             fd.append('file', file);
//             fd.append('resourceType', 'reimbursements');
//             fd.append('resourceId', id);
//             try {
//                 const up = await api.post('/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
//                 if (up.data.success) await api.post(`/reimbursements/${id}/attachments`, { fileName: file.name, filePath: up.data.path, fileType: file.type, fileSize: file.size });
//             } catch (e) { }
//         }
//     };

//     const showNotification = (message, severity = 'success') => {
//         setNotification({ message, severity });
//         setTimeout(() => setNotification(null), 4000);
//     };

//     const resetForm = () => {
//         setFormData(prev => ({
//             ...prev,
//             purpose: '',
//             periodCoveredFrom: '',
//             periodCoveredTo: '',
//             paymentMethod: 'payroll',
//             checkNumber: '',
//             accountNumber: '',
//             remarks: '',
//             status: 'draft'
//         }));
//         setItems([{ id: 1, expenseDate: '', description: '', estimatedAmount: 0, tin: '', vendor: '', accountCode: '' }]);
//         setItinerary([]);
//         setAttachments([]);
//         setErrors({});
//         generateReimbursementNumber();
//         showNotification('Form reset successfully', 'info');
//     };

//     const removeAttachment = (index) => {
//         const file = attachments[index];
//         if (file.isExisting) {
//             setPendingDeletes(prev => [...prev, file.id]);
//         }
//         setAttachments(prev => prev.filter((_, i) => i !== index));
//     };

//     return (
//         <div className="space-y-6">
//             {!viewOnly && (
//                 <div className="mb-6">
//                     <h2 className="text-2xl font-semibold text-gray-900 mb-1">Reimbursement Form</h2>
//                     <p className="text-gray-600">Request reimbursement for out-of-pocket expenses</p>
//                 </div>
//             )}

//             {/* Rejection Reason Banner */}
//             {viewOnly && editData?.status?.toLowerCase() === 'rejected' && (editData?.remarks || editData?.release_remarks) && (
//                 <InlineAlert severity="error">
//                     <div className="font-semibold mb-1">Rejection Reason:</div>
//                     <div>{editData.remarks || editData.release_remarks}</div>
//                 </InlineAlert>
//             )}

//             {notification && (
//                 <Alert severity={notification.severity} onClose={() => setNotification(null)}>
//                     {notification.message}
//                 </Alert>
//             )}

//             <Card>
//                 <CardContent>
//                     <h3 className="text-lg font-semibold text-gray-900 mb-4">Request Information</h3>
//                     <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
//                         <TruncatedViewField label="Reimbursement Number" value={formData.reimbursementNumber} />
//                         <TruncatedViewField label="Requested By" value={formData.requestedBy} />
//                         <TruncatedViewField label="Department" value={formData.department} />
                        
//                         <div>
//                             {!viewOnly ? (
//                                 <div className="relative border border-gray-300 rounded-lg px-3 h-[35px] flex items-center">
//                                     <span className="absolute -top-2 left-3 bg-white px-1 text-xs text-gray-600">Business Unit</span>
//                                     <div className="flex gap-6 w-full">
//                                         <label className="flex items-center gap-1 text-sm">
//                                             <input type="radio" name="businessUnit" value="EPC" checked={formData.businessUnit === 'EPC'} onChange={handleInputChange} className="w-4 h-4" />
//                                             EPC
//                                         </label>
//                                         <label className="flex items-center gap-1 text-sm">
//                                             <input type="radio" name="businessUnit" value="NBFI" checked={formData.businessUnit === 'NBFI'} onChange={handleInputChange} className="w-4 h-4" />
//                                             NBFI
//                                         </label>
//                                         <label className="flex items-center gap-1 text-sm">
//                                             <input type="radio" name="businessUnit" value="Shared" checked={formData.businessUnit === 'Shared'} onChange={handleInputChange} className="w-4 h-4" />
//                                             Shared
//                                         </label>
//                                     </div>
//                                 </div>
//                             ) : <TruncatedViewField label="Business Unit" value={formData.businessUnit} />}
//                         </div>

//                         <Input
//                             fullWidth
//                             label="Request Date"
//                             type={viewOnly ? 'text' : 'date'}
//                             name="reimbursementDate"
//                             value={viewOnly ? formatLongDate(formData.reimbursementDate) : formData.reimbursementDate}
//                             onChange={handleInputChange}
//                             readOnly={viewOnly}
//                         />

//                         {/* Period Covered - Combined field */}
//                         <div className="relative border border-gray-300 rounded-lg px-3 h-[35px] flex items-center gap-2 focus-within:border-primary-600 hover:border-gray-900">
//                             <span className="absolute -top-2 left-3 bg-white px-1 text-xs text-gray-600">Period Covered</span>
//                             <input
//                                 type={viewOnly ? 'text' : 'date'}
//                                 name="periodCoveredFrom"
//                                 value={viewOnly ? formatLongDate(formData.periodCoveredFrom) : formData.periodCoveredFrom}
//                                 onChange={handleInputChange}
//                                 readOnly={viewOnly}
//                                 max={(!viewOnly && formData.periodCoveredTo) ? formData.periodCoveredTo : undefined}
//                                 className="flex-1 bg-transparent border-none outline-none text-sm"
//                             />
//                             <span className="text-gray-500">—</span>
//                             <input
//                                 type={viewOnly ? 'text' : 'date'}
//                                 name="periodCoveredTo"
//                                 value={viewOnly ? formatLongDate(formData.periodCoveredTo) : formData.periodCoveredTo}
//                                 onChange={handleInputChange}
//                                 readOnly={viewOnly}
//                                 min={(!viewOnly && formData.periodCoveredFrom) ? formData.periodCoveredFrom : undefined}
//                                 className="flex-1 bg-transparent border-none outline-none text-sm text-right"
//                             />
//                         </div>

//                         {/* Purpose - Full width */}
//                         <div className="md:col-span-3">
//                             {viewOnly ? (
//                                 <TruncatedViewField label="Purpose" value={formData.purpose} />
//                             ) : (
//                                 <Input
//                                     fullWidth
//                                     multiline
//                                     rows={2}
//                                     label="Purpose"
//                                     name="purpose"
//                                     value={formData.purpose}
//                                     onChange={handleInputChange}
//                                     error={errors.purpose}
//                                 />
//                             )}
//                         </div>
//                     </div>
//                 </CardContent>
//             </Card>

//             <Card>
//                 <CardContent>
//                     <ItemsTable
//                         title="Budget Breakdown"
//                         items={items}
//                         advanceType="cash"
//                         estimatedLabel="Amount"
//                         showDate={true}
//                         showReceiptFields={true}
//                         viewOnly={viewOnly}
//                         onItemChange={handleItemChange}
//                         onAddItem={() => setItems(p => [...p, { id: Date.now(), expenseDate: '', description: '', estimatedAmount: 0, tin: '', vendor: '', address: '' }])}
//                         onRemoveItem={(id) => setItems(p => p.filter(it => it.id !== id))}
//                         errors={errors}
//                     />
//                 </CardContent>
//             </Card>

//             {/* Itinerary Sheet for Transportation - Hide if empty in viewOnly mode */}
//             {(!viewOnly || (itinerary && itinerary.length > 0)) && (
//                 <Card>
//                     <CardContent>
//                         <ItinerarySheet
//                             itinerary={itinerary}
//                             viewOnly={viewOnly}
//                             onItemChange={handleItineraryChange}
//                             onAddItem={addItineraryRow}
//                             onRemoveItem={removeItineraryRow}
//                             errors={errors}
//                         />
//                     </CardContent>
//                 </Card>
//             )}

//             <Card>
//                 <CardContent>
//                     <div className="flex justify-end">
//                         <div className="min-w-[180px] p-4 border border-gray-200 rounded-lg">
//                             <p className="text-xs text-gray-600 mb-1">Total</p>
//                             <h3 className="text-2xl font-semibold text-gray-900">₱ {calculateTotal().toLocaleString('en-US', { minimumFractionDigits: 2 })}</h3>
//                         </div>
//                     </div>
//                 </CardContent>
//             </Card>

//             <Card>
//                 <CardContent>
//                     <PaymentDetailsSection
//                         formData={formData}
//                         viewOnly={viewOnly}
//                         onInputChange={handleInputChange}
//                         errors={errors}
//                         disableAccountFields={true}
//                     />
//                 </CardContent>
//             </Card>

//             <Card>
//                 <CardContent>
//                     <AttachmentsSection
//                         attachments={attachments}
//                         viewOnly={viewOnly}
//                         onAttach={(e) => {
//                             const files = Array.from(e.target.files).map(f => { f.preview = URL.createObjectURL(f); return f; });
//                             setAttachments(p => [...p, ...files]);
//                         }}
//                         onRemove={removeAttachment}
//                     />
//                 </CardContent>
//             </Card>

//             <div className="flex gap-4 justify-end">
//                 {!viewOnly ? (
//                     <>
//                         <Button variant="secondary" startIcon={<RotateCcw className="w-4 h-4" />} onClick={resetForm}>Reset</Button>
//                         <Button variant="secondary" startIcon={<Save className="w-4 h-4" />} onClick={handleSaveDraft}>Save Draft</Button>
//                         <Button variant="primary" startIcon={<Send className="w-4 h-4" />} onClick={handleSubmit}>Submit</Button>
//                     </>
//                 ) : (!hideCloseButton && <Button variant="primary" onClick={onClose || (() => navigate('/my-requests'))}>Close</Button>)}
//             </div>
//         </div>
//     );
// };

// export default ReimbursementForm;
