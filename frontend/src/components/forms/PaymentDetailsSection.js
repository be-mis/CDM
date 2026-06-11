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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                        <Input
                            fullWidth
                            label="Payment Method"
                            value={methodOptions.find(o => o.value === formData.paymentMethod)?.label || formData.paymentMethod}
                            readOnly
                        />
                    )}
                </div>
                {/* Conditional Fields based on method */}
                {formData.paymentMethod === 'gcash' && (
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
                )}
                {formData.paymentMethod === 'payroll' && (
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
                )}
            </div>
        </div>
    );
};

export default PaymentDetailsSection;
