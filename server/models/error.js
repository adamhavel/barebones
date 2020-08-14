export class UserError extends Error {
    get statusCode() {
        return 400;
    }
}

export class LoginError extends UserError {
    get statusCode() {
        return 401;
    }
}

export class ApplicationError extends Error {}