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
        'create-subscription': 'vytvorit'
    },
    dashboard: 'prehled'
};

const route = function(path) {
    let includeMount = path.startsWith('/');
    let pathArr = path.split('/');
    let current = routes;

    if (!pathArr.length) return '/';

    return pathArr
      .filter(item => item.length)
      .reduce((acc, item, index) => {
        current = current[item];

        if (index === 0 && !includeMount) return acc;

        let isLeaf = typeof current === 'string';

        return acc + '/' + (isLeaf ? current : current.base);
    }, '');
}

export default route;
