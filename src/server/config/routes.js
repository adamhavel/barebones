const routes = {
    home: '',
    auth: {
        root: 'ucet',
        login: 'prihlasit',
        logout: 'odhlasit',
        register: 'vytvorit',
        forgot: 'zapomenute-heslo'
    },
    settings: {
        root: 'nastaveni',
    },
    payment: {
        root: 'predplatne'
    }
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
