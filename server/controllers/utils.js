import validator from 'express-validator';

export function render(view, data = {}) {
    return (req, res) => {
        const { body, query } = req;

        res.render(view, Object.assign({ body, query }, data));
    };
};

export function redirect(route) {
    return (req, res) => {
        res.redirect(route);
    };
};

export function renderValidationErrors(view, data = {}) {
    return (req, res, next) => {
        const errors = validator.validationResult(req);
        const { body, query } = req;

        if (errors.isEmpty()) {
            next();
        } else {
            res.status(422).render(view, Object.assign(
                {
                    errors: errors.mapped(),
                    body,
                    query
                },
                data
            ));
        }
    };
};