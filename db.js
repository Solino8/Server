const mysql = require('mysql2');

const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root', // Usuário root para conectar ao banco
    password: 'coxinha123', // Senha do usuário root
    database: 'legado_herois'
});

connection.connect((err) => {
    if (err) {
        console.error('Erro ao conectar ao banco de dados:', err);
        return;
    }
    console.log('Conectado ao banco de dados MySQL');

    module.exports = db;

    // Criar novo usuário e conceder privilégios
    const createUserQuery = `CREATE USER 'new_user'@'localhost' IDENTIFIED WITH mysql_native_password BY 'Legado52';`;
    const grantPrivilegesQuery = `GRANT ALL PRIVILEGES ON legado_herois.* TO 'new_user'@'localhost';`;
    
    connection.query(createUserQuery, (err) => {
        if (err) {
            console.error('Erro ao criar usuário:', err);
            return;
        }
        console.log('Usuário new_user criado com sucesso.');
        
        connection.query(grantPrivilegesQuery, (err) => {
            if (err) {
                console.error('Erro ao conceder privilégios:', err);
                return;
            }
            console.log('Privilégios concedidos ao usuário new_user.');
            connection.end(); // Fecha a conexão após as operações
        });
    });
});
