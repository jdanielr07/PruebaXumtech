require('dotenv').config();
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');

const app = express();

app.use(express.json());
app.use(cors({
  origin: 'http://localhost:3000' // Reemplaza con la URL de tu frontend
}));

// Middleware para verificar la clave API
function verifyApiKey(req, res, next) {
  console.log('API_KEY en el servidor:', process.env.API_KEY);
  const apiKey = req.headers['x-api-key'];
  if (apiKey !== process.env.API_KEY) {
    return res.status(401).json({ error: "API key inválida" });
  }
  next();
}

// Conectar a la base de datos SQLite
const db = new sqlite3.Database('./chatbot.db', (err) => {
  if (err) {
    console.error('Error al conectar a la base de datos:', err.message);
  } else {
    console.log('Conectado a la base de datos SQLite.');
    
     // Borrar todos los datos existentes en la tabla
     db.run("DELETE FROM responses", (err) => {
      if (err) {
        console.error('Error al borrar los datos existentes:', err.message);
      } else {
        console.log('Datos existentes eliminados.');

        // Insertar algunas respuestas de muestra
        const insertSample = db.prepare("INSERT OR IGNORE INTO responses (intent, response) VALUES (?, ?)");
        insertSample.run('saludo', '¡Hola! ¿En qué puedo ayudarte?');
        insertSample.run('despedida', 'Hasta luego, ¡que tengas un buen día!');
        insertSample.run('ayuda', '¿En qué puedo ayudarte? Estoy aquí para responder tus preguntas.');
        insertSample.run('gracias', 'De nada, estoy aquí para ayudar. ¿Hay algo más en lo que pueda asistirte?');
        insertSample.finalize();

        console.log('Datos de muestra insertados.');
      }
    });
  }
});

// Ruta para obtener respuestas
app.get('/responses', verifyApiKey, (req, res) => {
  db.all("SELECT * FROM responses", (err, rows) => {
    if (err) {
      console.error('Error al obtener respuestas:', err.message);
      return res.status(500).json({ error: "Error de servidor" });
    }
    res.json(rows);
  });
});

// Ruta para añadir una nueva respuesta
app.post('/responses', verifyApiKey, (req, res) => {
  const { intent, response } = req.body;
  db.run("INSERT INTO responses (intent, response) VALUES (?, ?)", [intent, response], function(err) {
    if (err) {
      console.error('Error al insertar respuesta:', err.message);
      return res.status(500).json({ error: "Error de servidor" });
    }
    res.json({ id: this.lastID });
  });
});

// Ruta para actualizar una respuesta existente
app.put('/responses/:id', verifyApiKey, (req, res) => {
  const { intent, response } = req.body;
  const { id } = req.params;
  db.run("UPDATE responses SET intent = ?, response = ? WHERE id = ?", [intent, response, id], function(err) {
    if (err) {
      console.error('Error al actualizar respuesta:', err.message);
      return res.status(500).json({ error: "Error de servidor" });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: "Respuesta no encontrada" });
    }
    res.json({ message: "Respuesta actualizada con éxito" });
  });
});

// Ruta para eliminar una respuesta
app.delete('/responses/:id', verifyApiKey, (req, res) => {
  const { id } = req.params;
  db.run("DELETE FROM responses WHERE id = ?", id, function(err) {
    if (err) {
      console.error('Error al eliminar respuesta:', err.message);
      return res.status(500).json({ error: "Error de servidor" });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: "Respuesta no encontrada" });
    }
    res.json({ message: "Respuesta eliminada con éxito" });
  });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Servidor corriendo en el puerto ${PORT}`));

// Manejo de cierre graceful
process.on('SIGINT', () => {
  db.close((err) => {
    if (err) {
      console.error(err.message);
    }
    console.log('Conexión a la base de datos cerrada.');
    process.exit(0);
  });
});