const routes = {
    landing: '',
    auth: {
        base: 'ucet',
        login: 'prihlasit',
        logout: 'odhlasit',
        register: 'vytvorit',
        reset: {
            base: 'zapomenute-heslo',
            confirm: 'nastavit'
        }
    },
    settings: {
        base: 'nastaveni',
        'update-password': 'zmenit-heslo',
        'update-email': 'zmenit-email',
        'delete-account': 'smazat-ucet'
    },
    subscription: {
        base: 'clenstvi',
        'create-subscription': 'vytvorit',
        'cancel-subscription': 'zrusit'
    },
    dashboard: 'prehled'
};

const route = function(path) {
    let pathArr = path.slice(1).split('/');
    let current = routes;

    return pathArr.reduce((acc, item, index) => {
        current = current[item];

        let isLeaf = typeof current === 'string';

        return acc + '/' + (isLeaf ? current : current.base);
    }, '');
}

export default route;
