import i18n from 'i18n';
import { body, validationResult } from 'express-validator';
import moment from 'moment';

import User from '../models/user.js';

const PASSWORD_MIN_LENGTH = 5;

export function renderFormErrors(view) {
    return (req, res, next) => {
        const errors = validationResult(req);

        if (errors.isEmpty()) {
            next();
        } else {
            res.status(422).render(view, {
                errors: errors.mapped()
            });
        }
    };
};

// TODO: Simplify validations.
export function email(name = 'email') {
    return async (req, res, next) => {
        await body(name)
            .notEmpty()
            .withMessage(i18n.__('common.form.error.email-empty'))
            .isEmail()
            .withMessage(i18n.__('common.form.error.email-invalid'))
            .normalizeEmail()
            .run(req);

        next();
    }
}

export function uniqueEmail(name = 'email') {
    return async (req, res, next) => {
        await body(name)
            .custom(async email => {
                if (email === req.user?.emailCandidate) {
                    return true;
                }

                // TODO: Rewrite to user id.
                if (await User.findOne({ email }) || await User.findOne({ emailCandidate: email })) {
                    throw new Error(i18n.__('common.form.error.email-not-available'));
                }

                return true;
            })
            .run(req);

        next();
    }
}

// TODO: Think through.
export function differentEmail(name = 'email') {
    return async (req, res, next) => {
        await body(name)
            .custom(async email => {
                const { user } = req;

                if (email === user.email) {
                    throw new Error(i18n.__('common.form.error.email-not-different'));
                }

                return true;
            })
            .run(req);

        next();
    }
}

export function password(name = 'password') {
    return async (req, res, next) => {
        await body(name)
            .isLength({ min: PASSWORD_MIN_LENGTH })
            .withMessage(i18n.__('common.form.error.password-length'))
            .run(req);

        next();
    }
}

export function passwordMatch(name = 'password') {
    return async (req, res, next) => {
        await body(name)
            .custom(async password => {
                if (!(await req.user.matchesPassword(password))) {
                    throw new Error(i18n.__('common.form.error.password-invalid'));
                }

                return true;
            })
            .run(req);

        next();
    }
}

