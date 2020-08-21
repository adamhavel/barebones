export class ApplicationError extends Error {}

export class UserError extends Error {
    get statusCode() {
        return 400;
    }
}

export class AuthError extends UserError {
    get statusCode() {
        return 401;
    }
}