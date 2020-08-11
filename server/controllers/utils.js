import validator from 'express-validator';

export function render(view) {
    return (req, res) => {
        res.render(view);
    };
};

export function renderValidationErrors(view) {
    return (req, res, next) => {
        const errors = validator.validationResult(req);

        if (errors.isEmpty()) {
            next();
        } else {
            res.status(422).render(view, {
                errors: errors.mapped(),
                body: req.body
            });
        }
    };
};