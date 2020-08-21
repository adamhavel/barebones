const routes = {
    home: '',
    auth: {
        root: 'account',
        login: 'login',
        logout: 'logout',
        register: 'register',
        forgot: 'forgot-password'
    },
    settings: {
        root: 'settings',
    },
};

const route = function(path) {
    let pathArr = path.split('/');
    let current = routes;

    return pathArr.reduce((acc, item) => {
        current = current[item];

        let isLeaf = typeof current === 'string';

        return acc + '/' + (isLeaf ? current : current.root);
    }, '');
}

export default route;
