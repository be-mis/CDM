import React, { useId } from 'react';

const controlStyle = (error, readOnly = false) =>
  `block min-h-[44px] w-full min-w-0 rounded-lg border px-3 py-2.5 text-base text-gray-900 outline-none sm:text-sm ${
    error
      ? 'border-red-400 focus:ring-2 focus:ring-red-100'
      : 'border-gray-200 focus:border-gray-400 focus:ring-2 focus:ring-gray-100'
  } ${readOnly ? 'bg-gray-50' : 'bg-white'}`;

function PaymentField({
  id,
  label,
  name,
  value,
  onChange,
  readOnly,
  viewOnly,
  error,
  inputMode
}) {
  return (
    <div className="min-w-0">
      <label
        htmlFor={viewOnly ? undefined : id}
        className="mb-2 block text-xs font-semibold text-gray-600"
      >
        {label}
      </label>

      {viewOnly ? (
        <p className="min-h-[44px] break-words rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900">
          {value || '—'}
        </p>
      ) : (
        <input
          id={id}
          name={name}
          type="text"
          inputMode={inputMode}
          value={value || ''}
          onChange={onChange}
          readOnly={readOnly}
          required
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          className={controlStyle(error, readOnly)}
        />
      )}

      {error && !viewOnly && (
        <p id={`${id}-error`} className="mt-1.5 text-xs text-red-600">
          {typeof error === 'string'
            ? error
            : 'Please check this field.'}
        </p>
      )}
    </div>
  );
}

export default function PaymentDetailsSection({
  formData,
  viewOnly = false,
  onInputChange,
  errors = {},
  methodOptions = [
    { value: 'gcash', label: 'G-Cash' },
    { value: 'payroll', label: 'Transfer to Payroll Account' }
  ],
  disableAccountFields = false
}) {
  const id = useId();

  return (
    <section className="min-w-0">
      <h3 className="mb-5 text-sm font-semibold text-gray-900">
        Payment Details
      </h3>

      <div className="grid min-w-0 grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        <div className="min-w-0">
          <label
            htmlFor={viewOnly ? undefined : `${id}-method`}
            className="mb-2 block text-xs font-semibold text-gray-600"
          >
            Payment Method
          </label>

          {viewOnly ? (
            <p className="min-h-[44px] break-words rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900">
              {methodOptions.find(
                (option) => option.value === formData.paymentMethod
              )?.label ||
                formData.paymentMethod ||
                '—'}
            </p>
          ) : (
            <select
              id={`${id}-method`}
              name="paymentMethod"
              value={formData.paymentMethod || ''}
              onChange={onInputChange}
              aria-invalid={Boolean(errors.paymentMethod)}
              aria-describedby={
                errors.paymentMethod ? `${id}-method-error` : undefined
              }
              className={controlStyle(errors.paymentMethod)}
            >
              <option value="" disabled>
                Select Payment Method
              </option>

              {methodOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          )}

          {errors.paymentMethod && !viewOnly && (
            <p
              id={`${id}-method-error`}
              className="mt-1.5 text-xs text-red-600"
            >
              {typeof errors.paymentMethod === 'string'
                ? errors.paymentMethod
                : 'Please select a payment method.'}
            </p>
          )}
        </div>

        {formData.paymentMethod === 'gcash' && (
          <>
            <PaymentField
              id={`${id}-gcash-name`}
              label="GCash Name"
              name="gcashName"
              value={formData.gcashName}
              onChange={onInputChange}
              readOnly={disableAccountFields}
              viewOnly={viewOnly}
              error={errors.gcashName}
            />

            <PaymentField
              id={`${id}-gcash-number`}
              label="GCash Account Number"
              name="accountNumber"
              value={formData.accountNumber}
              onChange={onInputChange}
              readOnly={disableAccountFields}
              viewOnly={viewOnly}
              error={errors.accountNumber}
              inputMode="numeric"
            />
          </>
        )}

        {formData.paymentMethod === 'payroll' && (
          <PaymentField
            id={`${id}-payroll`}
            label="Payroll Account Number"
            name="accountNumber"
            value={formData.accountNumber}
            onChange={onInputChange}
            readOnly={disableAccountFields}
            viewOnly={viewOnly}
            error={errors.accountNumber}
            inputMode="numeric"
          />
        )}
      </div>
    </section>
  );
}