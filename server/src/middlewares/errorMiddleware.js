export function notFound(req, res, next) {
    const error = new Error(`Not Found - ${req.originalUrl}`);
    res.status(404);
    next(error);
}

function isZodError(err) {
    return Boolean(err && (err.name === 'ZodError' || Array.isArray(err.issues)));
}

function humanizePath(path) {
    if (!Array.isArray(path) || path.length === 0) return 'This field';
    const key = path.map((p) => String(p)).join('.');

    const labels = {
        'contact.emailOrPhone': 'Email or phone number',
        'contact.email': 'Email address',
        'shippingAddress.country': 'Country',
        'shippingAddress.firstName': 'First name',
        'shippingAddress.lastName': 'Last name',
        'shippingAddress.address1': 'Address',
        'shippingAddress.address2': 'Address line 2',
        'shippingAddress.city': 'City',
        'shippingAddress.postalCode': 'Postal code',
        'shippingAddress.phone': 'Phone number',
        'billingAddress.country': 'Billing country',
        'billingAddress.firstName': 'Billing first name',
        'billingAddress.lastName': 'Billing last name',
        'billingAddress.address1': 'Billing address',
        'billingAddress.address2': 'Billing address line 2',
        'billingAddress.city': 'Billing city',
        'billingAddress.postalCode': 'Billing postal code',
        'billingAddress.phone': 'Billing phone number',
    };

    if (labels[key]) return labels[key];

    // Fallback: "shippingAddress.firstName" -> "Shipping address first name"
    return key
        .replace(/([A-Z])/g, ' $1')
        .replace(/\./g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function humanizeZodIssue(issue) {
    const label = humanizePath(issue?.path);
    const code = String(issue?.code || '');

    if (code === 'too_small') {
        // Typical required-field case (min 1 for strings / arrays)
        if (issue?.type === 'string') return `${label} is required.`;
        return `Please provide a valid ${label}.`;
    }

    if (code === 'invalid_string' && issue?.validation === 'email') {
        return 'Please enter a valid email address.';
    }

    if (code === 'invalid_type') {
        return `Please provide a valid ${label}.`;
    }

    // Generic fallback: use Zod message but prefix with a friendly label.
    const msg = String(issue?.message || '').trim();
    if (!msg) return `Please check ${label}.`;
    return `${label}: ${msg}`;
}

function normalizeValidationErrors(err) {
    const issues = Array.isArray(err?.issues) ? err.issues : [];
    const errors = issues.map((issue) => ({
        field: Array.isArray(issue?.path) ? issue.path.map((p) => String(p)).join('.') : '',
        message: humanizeZodIssue(issue),
    }));

    const uniqueMessages = Array.from(new Set(errors.map((e) => e.message).filter(Boolean)));
    const message = uniqueMessages.length ? uniqueMessages[0] : 'Please check your inputs.';

    return { message, errors };
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
    if (isZodError(err)) {
        const statusCode = res.statusCode && res.statusCode !== 200 ? res.statusCode : 400;
        const { message, errors } = normalizeValidationErrors(err);
        res.status(statusCode).json({
            message,
            errors,
        });
        return;
    }

    const statusCode = res.statusCode && res.statusCode !== 200 ? res.statusCode : 500;
    res.status(statusCode);
    res.json({
        message: err.message || 'Server error',
        stack: process.env.NODE_ENV === 'production' ? undefined : err.stack,
    });
}
