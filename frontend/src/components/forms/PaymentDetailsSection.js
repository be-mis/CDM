import React from 'react';
import Input from '../ui/Input';
import Select from '../ui/Select';

const PaymentDetailsSection = ({
    formData,
    viewOnly,
    onInputChange,
    errors,
    methodOptions = [
        { value: 'gcash', label: 'G-Cash' },
        { value: 'payroll', label: 'Transfer to Payroll Account' }
    ],
    disableAccountFields = false
}) => {
    return (
        <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Payment Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                <div>
                    {!viewOnly ? (
                        <Select
                            label="Payment Method"
                            name="paymentMethod"
                            fullWidth
                            value={formData.paymentMethod}
                            onChange={onInputChange}
                        >
                            {methodOptions.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </Select>
                    ) : (
                        <div>
                            <label className="px-1 text-xs text-gray-600">Payment Method</label>
                            <div className="px-1 py-1 font-bold border-b border-gray-200 text-sm text-gray-900 whitespace-pre-wrap">
                                {methodOptions.find(o => o.value === formData.paymentMethod)?.label || formData.paymentMethod}
                            </div>
                        </div>
                    )}
                </div>
                {/* Conditional Fields based on method */}
                {formData.paymentMethod === 'gcash' && (
                    !viewOnly ? (
                        <>
                            <div>
                                <Input
                                    fullWidth
                                    required
                                    label="Gcash Name"
                                    name="gcashName"
                                    value={formData.gcashName || ''}
                                    onChange={viewOnly ? undefined : onInputChange}
                                    error={errors?.gcashName}
                                    readOnly={viewOnly || disableAccountFields}
                                />
                            </div>
                            <div>
                                <Input
                                    fullWidth
                                    required
                                    label="G-Cash Account Number"
                                    name="accountNumber"
                                    value={formData.accountNumber || ''}
                                    onChange={viewOnly ? undefined : onInputChange}
                                    readOnly={viewOnly || disableAccountFields}
                                    error={errors?.accountNumber}
                                />
                            </div>
                        </>
                    ) : (
                        <>
                            <div>
                                <label className="px-1 text-xs text-gray-600">Gcash Name</label>
                                <div className="px-1 py-1 font-bold border-b border-gray-200 text-sm text-gray-900 whitespace-pre-wrap">
                                    {formData.gcashName}
                                </div>
                            </div>
                            <div>
                                <label className="px-1 text-xs text-gray-600">G-Cash Account Number</label>
                                <div className="px-1 py-1 font-bold border-b border-gray-200 text-sm text-gray-900 whitespace-pre-wrap">
                                    {formData.accountNumber}
                                </div>
                            </div>
                        </>
                    )
                )}
                {formData.paymentMethod === 'payroll' && (
                    !viewOnly ? (

                    <div>
                        <Input
                            fullWidth
                            required
                            label="Payroll Account Number"
                            name="accountNumber"
                            value={formData.accountNumber || ''}
                            onChange={viewOnly ? undefined : onInputChange}
                            readOnly={viewOnly || disableAccountFields}
                            error={errors?.accountNumber}
                        />
                    </div>
                    ) : (
                        <div>
                            <label className="px-1 text-xs text-gray-600">Payroll Account Number</label>
                            <div className="px-1 py-1 font-bold border-b border-gray-200 text-sm text-gray-900 whitespace-pre-wrap">
                                {formData.accountNumber}
                            </div>
                        </div>
                    )
                )}
            </div>
        </div>
    );
};

export default PaymentDetailsSection;
