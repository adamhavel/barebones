import validator from 'express-validator';
import moment from 'moment';

import User from '../models/user.js';

const PASSWORD_MIN_LENGTH = 5;
const { body } = validator;

export function renderErrors(view) {
    return (req, res, next) => {
        const errors = validator.validationResult(req);

        if (errors.isEmpty()) {
            next();
        } else {
            const { query, body } = req;

            res.status(422).render(view, {
                errors: errors.mapped(),
                query,
                body
            });
        }
    };
};

export function email(name = 'email') {
    return body(name, 'must be valid')
        .if(body(name).exists())
        .notEmpty().withMessage('must not be empty')
        .isEmail()
        .normalizeEmail();
}

export function uniqueEmail(name = 'email') {
    return body(name)
        .if(body(name).exists())
        .custom(async email => {
            const existingUser = await User.findOne({ email }).exec();

            if (existingUser) {
                throw new Error('already in use');
            } else {
                return true;
            }
        });
}

export function password(name = 'password') {
    return body(name, 'must be at least 5 chars long')
        .if(body(name).exists())
        .isLength({ min: PASSWORD_MIN_LENGTH });
}

export function passwordMatch(name = 'password') {
    return body(name)
        .if(body(name).exists())
        .custom(async (password, { req }) => {
            const passwordMatches = await req.user.matchesPassword(password);

            if (!passwordMatches) {
                throw new Error('invalid password');
            } else {
                return true;
            }
        });
}

export function passwordDifference(nameA = 'newPassword', nameB = 'oldPassword') {
    return body(nameA, 'are the same')
        .if(body(nameA).exists())
        .if(body(nameB).exists())
        .custom((newPassword, { req }) => newPassword !== req.body[nameB]);
}

