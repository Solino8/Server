const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const app = express();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const bodyParser = require('body-parser');

app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Servindo arquivos estáticos diretamente do diretório raiz
app.use(express.static(__dirname));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Rotas de páginas
app.get('/cadastro', (req, res) => {
    res.sendFile(path.join(__dirname, 'cadastro.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'login.html'));
});

app.get('/inicio', (req, res) => {
    res.sendFile(path.join(__dirname, 'inicio.html'));
});

app.get('/gerenciar', (req, res) => {
    res.sendFile(path.join(__dirname, 'gerenciar.html'));
});

// Configuração do banco de dados
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'coxinha123',
    database: 'legado_herois'
});

db.connect((err) => {
    if (err) {
        console.error('Erro ao conectar ao banco de dados:', err);
    } else {
        console.log('Conectado ao banco de dados MySQL');
    }
});

// Rota para cadastro de usuários
app.post('/cadastrar', (req, res) => {
    const { nome, email, usuario, senha } = req.body;
    if (!nome || !email || !usuario || !senha) {
        return res.status(400).send('Todos os campos são obrigatórios');
    }

    const query = 'INSERT INTO usuarios (nome, email, usuario, senha) VALUES (?, ?, ?, ?)';
    db.query(query, [nome, email, usuario, senha], (err, result) => {
        if (err) {
            console.error('Erro ao cadastrar usuário:', err);
            return res.status(500).send('Erro ao cadastrar usuário: ' + err.message);
        }
        res.status(200).send('Usuário cadastrado com sucesso');
    });
});

// Rota para login
app.post('/login', (req, res) => {
    const { usuario, senha } = req.body;
    if (!usuario || !senha) {
        return res.status(400).send('Usuário e senha são obrigatórios');
    }

    const query = 'SELECT * FROM usuarios WHERE usuario = ? AND senha = ?';
    db.query(query, [usuario, senha], (err, result) => {
        if (err) {
            console.error('Erro no servidor durante login:', err);
            return res.status(500).send('Erro no servidor');
        }
        if (result.length > 0) {
            res.status(200).send('Login bem-sucedido');
        } else {
            res.status(401).send('Usuário ou senha inválidos');
        }
    });
});

// Rota para a página de perfil
app.get('/perfil', (req, res) => {
    res.sendFile(path.join(__dirname, 'perfil.html'));
});

// Rota para obter dados do perfil
app.get('/perfil', (req, res) => {
    const usuarioId = req.user.id; // exemplo de como capturar o usuário logado
    const query = 'SELECT nome, email, usuario FROM usuarios WHERE id = ?';
    db.query(query, [usuarioId], (err, result) => {
        if (err) {
            return res.status(500).send('Erro ao carregar perfil');
        }
        res.json(result[0]);
    });
});

// Rota para editar perfil
app.put('/editar-perfil', (req, res) => {
    const usuarioId = req.user.id;
    const { nome, email } = req.body;
    const query = 'UPDATE usuarios SET nome = ?, email = ? WHERE id = ?';
    db.query(query, [nome, email, usuarioId], (err) => {
        if (err) {
            return res.status(500).send('Erro ao atualizar perfil');
        }
        res.send('Perfil atualizado com sucesso');
    });
});

// Rota para deletar conta do usuário
app.delete('/deletar-perfil', (req, res) => {
    const usuarioId = req.user.id;
    const query = 'DELETE FROM usuarios WHERE id = ?';
    db.query(query, [usuarioId], (err) => {
        if (err) {
            return res.status(500).send('Erro ao deletar conta');
        }
        res.send('Conta deletada com sucesso');
    });
});


// Servindo diretórios específicos (PDFs, Imagens e CSS)
app.use('/hqs', express.static(path.join(__dirname, 'HQS')));
app.use('/images', express.static(path.join(__dirname, 'Images')));
app.use('/css', express.static(path.join(__dirname, 'css')));
app.use('/hqs', express.static(path.join(__dirname, 'HQS')));


// Função para remover acentos e caracteres inválidos para nomes de arquivos
function sanitizeFilename(filename) {
    return filename
        .normalize('NFD') // Normaliza a string para decompor acentos
        .replace(/[\u0300-\u036f]/g, "") // Remove marcas diacríticas (acentos)
        .replace(/[<>:"/\\|?*\x00-\x1F]/g, '') // Remove caracteres inválidos para nomes de arquivos
        .replace(/[\s]+/g, '_'); // Substitui espaços por sublinhados
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        if (file.fieldname === 'imagem') {
            // Salvando imagens na pasta correta
            cb(null, path.join(__dirname, 'Images'));
        } else {
            // Salvando PDFs na pasta da HQ
            const dir = path.join(__dirname, 'HQS', req.body.nome);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            cb(null, dir);
        }
    },
    filename: (req, file, cb) => {
        // Sanitiza o nome do arquivo
        const sanitizedFilename = sanitizeFilename(file.originalname);
        cb(null, sanitizedFilename);
    }
});

const upload = multer({ storage: storage });


// Rota para adicionar HQs com upload de múltiplos arquivos
app.post('/adicionar-hq', upload.fields([{ name: 'imagem', maxCount: 1 }, { name: 'pdfs', maxCount: 20 }]), (req, res) => {
    const { nome, descricao } = req.body;
    const imagem = req.files.imagem ? req.files.imagem[0].filename : null;
    const pdfs = req.files.pdfs.map(file => file.filename);

    if (!pdfs.length) {
        return res.status(400).send('Erro ao enviar os PDFs.');
    }

    const pdfPath = nome;

    const sql = 'INSERT INTO hqs (nome, descricao, imagem, pdf_path) VALUES (?, ?, ?, ?)';
    db.query(sql, [nome, descricao, imagem, pdfPath], (err) => {
        if (err) {
            console.error('Erro ao adicionar HQ:', err);
            res.status(500).send('Erro ao adicionar HQ.');
        } else {
            res.json({ message: 'HQ adicionada com sucesso.', redirect: '/gerenciar' });
        }
    });
});

// Rota para listar HQs e capítulos
app.get('/listar-hqs', (req, res) => {
    const sql = 'SELECT id, nome, descricao, imagem, pdf_path FROM hqs';
    db.query(sql, (err, results) => {
        if (err) {
            res.status(500).send('Erro ao listar HQs');
            return;
        }

        const hqs = results.map(hq => {
            const dirPath = path.join(__dirname, 'HQS', hq.pdf_path);
            let chapters = [];

            if (fs.existsSync(dirPath)) {
                chapters = fs.readdirSync(dirPath)
                    .filter(file => file.endsWith('.pdf'))
                    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }))
                    .map(file => `${hq.pdf_path}/${file}`);
            }

            hq.chapters = chapters;
            return hq;
        });

        res.json(hqs);
    });
});

// Rota para remover HQ e deletar o PDF associado
// Rota para remover HQ e deletar o PDF associado
app.delete('/remover-hq/:id', (req, res) => {
    const id = req.params.id;

    const getPDFPath = 'SELECT pdf_path FROM hqs WHERE id = ?';
    db.query(getPDFPath, [id], (err, result) => {
        if (err) {
            console.error('Erro ao buscar o caminho do PDF:', err);
            return res.status(500).send('Erro ao buscar o caminho do PDF.');
        }

        if (result.length === 0) {
            console.error('Caminho da HQ não encontrado no banco de dados.');
            return res.status(404).send('Caminho da HQ não encontrado.');
        }

        const pdfPath = result[0].pdf_path;
        const dirPath = path.join(__dirname, 'HQS', pdfPath);

        console.log(`Tentando remover arquivos em: ${dirPath}`);

        // Remover comentários associados à HQ
        const deleteComments = 'DELETE FROM comentarios WHERE hq_id = ?';
        db.query(deleteComments, [id], (err) => {
            if (err) {
                console.error('Erro ao remover comentários associados:', err);
                return res.status(500).send('Erro ao remover comentários associados.');
            }

            // Verifica se o diretório existe
            if (fs.existsSync(dirPath)) {
                fs.rm(dirPath, { recursive: true, force: true }, (err) => {
                    if (err) {
                        console.error('Erro ao deletar a pasta da HQ:', err);
                        // Se o diretório não puder ser removido, mas ainda queremos continuar
                        // com a remoção da HQ do banco de dados, apenas registre o erro.
                    }
                    
                    // Remover HQ do banco de dados
                    const deleteHQ = 'DELETE FROM hqs WHERE id = ?';
                    db.query(deleteHQ, [id], (err) => {
                        if (err) {
                            console.error('Erro ao remover HQ do banco de dados:', err);
                            return res.status(500).send('Erro ao remover HQ.');
                        }
                        res.send('HQ removida com sucesso');
                    });
                });
            } else {
                console.error(`Diretório não encontrado: ${dirPath}`);
                // Se o diretório não existir, continue a remoção do banco de dados
                const deleteHQ = 'DELETE FROM hqs WHERE id = ?';
                db.query(deleteHQ, [id], (err) => {
                    if (err) {
                        console.error('Erro ao remover HQ do banco de dados:', err);
                        return res.status(500).send('Erro ao remover HQ.');
                    }
                    res.send('HQ removida com sucesso, mas o diretório não foi encontrado.');
                });
            }
        });
    });
});



// Rota para exibir detalhes de uma HQ específica
app.get('/hq/:id', (req, res) => {
    const hqId = parseInt(req.params.id, 10);
    console.log(`Acessando a HQ com ID: ${hqId}`);

    if (isNaN(hqId)) {
        console.log('ID inválido fornecido.');
        return res.status(400).send('ID inválido fornecido.');
    }

    const sql = 'SELECT * FROM hqs WHERE id = ?';
    db.query(sql, [hqId], (err, results) => {
        if (err) {
            console.error('Erro ao consultar a HQ:', err);
            return res.status(500).send('Erro ao buscar HQ.');
        }

        if (results.length === 0) {
            console.log(`HQ com ID ${hqId} não encontrada.`);
            return res.status(404).send(`HQ com ID ${hqId} não encontrada.`);
        }

        const hq = results[0];
        const dirPath = path.join(__dirname, 'HQS', hq.pdf_path);
        let chapters = [];

        if (fs.existsSync(dirPath)) {
            chapters = fs.readdirSync(dirPath)
                .filter(file => file.endsWith('.pdf'))
                .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }))
                .map(file => `${hq.pdf_path}/${file}`);
        }

        hq.chapters = chapters;

        const commentsSql = 'SELECT * FROM comentarios WHERE hq_id = ? ORDER BY data_comentario DESC';
        db.query(commentsSql, [hqId], (err, comments) => {
            if (err) {
                console.error('Erro ao buscar comentários:', err);
                return res.status(500).send('Erro ao buscar comentários');
            }

            res.render('hq', { hq, comments });
        });
    });
});

// Rota para adicionar um comentário
app.post('/hq/:id/comentar', (req, res) => {
    console.log('Dados recebidos:', req.body);
    const hqId = req.params.id;
    const { usuario, comentario } = req.body;

    if (!usuario || !comentario) {
        return res.status(400).send('Usuário e comentário são obrigatórios');
    }

    const sql = 'INSERT INTO comentarios (hq_id, usuario, comentario) VALUES (?, ?, ?)';
    db.query(sql, [hqId, usuario, comentario], (err) => {
        if (err) {
            console.error('Erro ao adicionar comentário:', err);
            return res.status(500).send('Erro ao adicionar comentário');
        }
        res.redirect(`/hq/${hqId}`);
    });
});



// Rota para excluir um comentário com base no id
// Rota para excluir um comentário com base no ID
app.delete('/hq/excluir-comentario/:id', (req, res) => {
    const commentId = req.params.id; // Obtém o ID do comentário a partir dos parâmetros da URL
    const deleteCommentQuery = 'DELETE FROM comentarios WHERE id = ?';

    db.query(deleteCommentQuery, [commentId], (err, result) => {
        if (err) {
            console.error('Erro ao excluir comentário:', err);
            return res.status(500).send('Erro ao excluir o comentário.');
        }

        if (result.affectedRows === 0) {
            return res.status(404).send('Comentário não encontrado.');
        }

        res.status(200).send('Comentário excluído com sucesso.');
    });
});

//rota da avaliacao
app.post('/hq/:id/avaliar', (req, res) => {
    const hqId = req.params.id;
    const { usuario, nota } = req.body;

    const insertAvaliacaoQuery = 'INSERT INTO avaliacoes (hq_id, usuario, nota) VALUES (?, ?, ?)';
    db.query(insertAvaliacaoQuery, [hqId, usuario, nota], (err, result) => {
        if (err) {
            console.error('Erro ao salvar avaliação:', err);
            return res.status(500).send('Erro ao salvar avaliação.');
        }

        // Atualizar média de avaliações
        const updateMediaQuery = `
            SELECT AVG(nota) AS media_avaliacao FROM avaliacoes WHERE hq_id = ?
        `;
        db.query(updateMediaQuery, [hqId], (err, result) => {
            if (err) {
                console.error('Erro ao calcular média de avaliações:', err);
                return res.status(500).send('Erro ao calcular média de avaliações.');
            }

            const mediaAvaliacao = result[0].media_avaliacao;
            const updateHqMediaQuery = 'UPDATE hqs SET media_avaliacao = ? WHERE id = ?';
            db.query(updateHqMediaQuery, [mediaAvaliacao, hqId], (err) => {
                if (err) {
                    console.error('Erro ao atualizar média de avaliações na HQ:', err);
                    return res.status(500).send('Erro ao atualizar média de avaliações.');
                }
                res.redirect(`/hq/${hqId}`);
            });
        });
    });
});


// Iniciar o servidor na porta 3000
app.listen(3000, () => {
    console.log('Servidor rodando na porta 3000');
});
