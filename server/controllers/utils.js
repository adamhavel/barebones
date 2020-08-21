export function render(view) {
    return (req, res) => {
        res.render(view);
    };
};

export function redirect(route) {
    return (req, res) => {
        res.redirect(route);
    };
};