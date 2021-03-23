import { UserError } from '../models/error.js';
import { FlashType } from '../models/flash.js';

export function render(view, data) {
    return (req, res) => {
        res.render(view, data);
    };
};

export function redirect(route) {
    return (req, res) => {
        res.redirect(route);
    };
};

export function renderUserError(view) {
    return (err, req, res, next) => {
        if (err instanceof UserError) {
            res.flash(FlashType.Error, err.message).status(err.statusCode).render(view);
        } else {
            next(err);
        }
    }
}
