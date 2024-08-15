require('dotenv').config();
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const stringSimilarity = require('string-similarity');

const app = express();

app.use(express.json());
app.use(cors({
  origin: 'http://localhost:3000' // Reemplaza con la URL de tu frontend
}));

// Conexión a la base de datos
const db = new sqlite3.Database('./chatbot.db', (err) => {
  if (err) {
    console.error('Error al conectar a la base de datos:', err.message);
  } else {
    console.log('Conectado a la base de datos SQLite.');
    
    // Borrar la tabla qa_pairs si existe
    db.run(`DROP TABLE IF EXISTS qa_pairs`, (err) => {
      if (err) {
        console.error('Error al borrar la tabla qa_pairs:', err.message);
      } else {
        console.log('Tabla qa_pairs borrada correctamente.');
        
        // Recrear la tabla qa_pairs
        db.run(`CREATE TABLE IF NOT EXISTS qa_pairs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          question TEXT NOT NULL,
          answer TEXT NOT NULL
        )`, (err) => {
          if (err) {
            console.error('Error al crear la tabla qa_pairs:', err.message);
          } else {
            console.log('Tabla qa_pairs creada correctamente.');
            
            // Insertar datos de muestra
            const sampleData = [
              { question: '¿Cómo estás?', answer: '¡Estoy bien, gracias por preguntar! ¿En qué puedo ayudarte hoy?' },
              { question: 'Hola', answer: '¡Hola! ¿En qué puedo asistirte?' },
              { question: 'Adiós', answer: 'Hasta luego, ¡que tengas un buen día!' },
              { question: '¿Puedes ayudarme?', answer: 'Por supuesto, estoy aquí para ayudarte. ¿Qué necesitas?' },
              { question: '¿Cuál es tu nombre?', answer: 'Soy un asistente virtual, puedes llamarme ChatBot.' },
              { question: '¿Qué tiempo hace hoy?', answer: 'Lo siento, no tengo información en tiempo real sobre el clima. ¿Puedo ayudarte con algo más?' },
              { question: '¿Cuál es el sentido de la vida?', answer: '¡Esa es una pregunta profunda! Filosóficamente, varía según las creencias de cada uno. ¿Quieres discutir sobre filosofía?' },
              { question: '¿Cuántos años tienes?', answer: 'Soy un programa de computadora, así que no tengo edad en el sentido tradicional. Fui creado recientemente para ayudar a responder preguntas.' },
              { question: '¿Qué puedes hacer?', answer: 'Puedo responder preguntas, proporcionar información y ayudar con varias tareas. ¿Hay algo específico en lo que pueda ayudarte?' },
              { question: '¿Quién te creó?', answer: 'Fui creado por un desarrollador como parte de un proyecto de chatbot. ¿Tienes curiosidad sobre la inteligencia artificial?' }
            ];
            
            const insertStmt = db.prepare("INSERT INTO qa_pairs (question, answer) VALUES (?, ?)");
            sampleData.forEach(item => {
              insertStmt.run(item.question, item.answer);
            });
            insertStmt.finalize();
            
          }
        });
      }
    });

    // Borrar la tabla question_associations si existe
    db.run(`DROP TABLE IF EXISTS question_associations`, (err) => {
      if (err) {
        console.error('Error al borrar la tabla question_associations:', err.message);
      } else {
        console.log('Tabla question_associations borrada correctamente.');
        
        // Recrear la tabla question_associations
        db.run(`CREATE TABLE IF NOT EXISTS question_associations (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          original_question TEXT NOT NULL,
          associated_question TEXT NOT NULL,
          count INTEGER NOT NULL DEFAULT 0,
          UNIQUE (original_question, associated_question)
        )`, (err) => {
          if (err) {
            console.error('Error al crear la tabla question_associations:', err.message);
          } else {
            console.log('Tabla question_associations creada correctamente.');
          }
        });
      }
    });
  }
});

// Eliminar duplicados en la tabla qa_pairs
db.serialize(() => {
  // Identificar duplicados basados en la pregunta (ignorando mayúsculas y minúsculas)
  db.all(`
    SELECT id, question, answer
    FROM qa_pairs
    WHERE LOWER(question) IN (
      SELECT LOWER(question)
      FROM qa_pairs
      GROUP BY LOWER(question)
      HAVING COUNT(*) > 1
    )
  `, (err, rows) => {
    if (err) {
      console.error('Error al identificar duplicados:', err.message);
      return;
    }

    if (rows.length === 0) {
      console.log('No se encontraron duplicados.');
      return;
    }

    // Crear un mapa para almacenar la primera ocurrencia de cada pregunta
    const uniqueQuestions = new Map();

    rows.forEach(row => {
      const normalizedQuestion = row.question.toLowerCase();
      
      // Si ya hemos visto esta pregunta, es un duplicado
      if (uniqueQuestions.has(normalizedQuestion)) {
        // Eliminar el duplicado
        db.run(`DELETE FROM qa_pairs WHERE id = ?`, [row.id], (err) => {
          if (err) {
            console.error(`Error al eliminar duplicado con id ${row.id}:`, err.message);
          } else {
            console.log(`Duplicado con id ${row.id} eliminado.`);
          }
        });
      } else {
        // Si no hemos visto esta pregunta, la marcamos como única
        uniqueQuestions.set(normalizedQuestion, row.id);
      }
    });

    console.log('Eliminación de duplicados completada.');
  });
});

// Middleware para verificar la clave API
function verifyApiKey(req, res, next) {
  const apiKey = req.headers['x-api-key'];
  if (apiKey !== process.env.API_KEY) {
    return res.status(401).json({ error: "API key inválida" });
  }
  next();
}

// Ruta para obtener todas las preguntas y respuestas
app.get('/qa_pairs', verifyApiKey, (req, res) => {
  db.all("SELECT * FROM qa_pairs", (err, rows) => {
    if (err) {
      console.error('Error al obtener pares de preguntas y respuestas:', err.message);
      return res.status(500).json({ error: "Error de servidor" });
    }
    res.json(rows);
  });
});

// Ruta para añadir una nueva pregunta y respuesta
app.post('/qa_pairs', verifyApiKey, (req, res) => {
  const { question, answer } = req.body;
  db.run("INSERT INTO qa_pairs (question, answer) VALUES (?, ?)", [question, answer], function(err) {
    if (err) {
      console.error('Error al insertar par de pregunta y respuesta:', err.message);
      return res.status(500).json({ error: "Error de servidor" });
    }
    res.json({ id: this.lastID });
  });
});

// Ruta para procesar un mensaje y obtener una respuesta
app.post('/process_message', verifyApiKey, async (req, res) => {
  const { message } = req.body;
  console.log('Mensaje recibido:', message);

  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: "Mensaje inválido" });
  }

  try {
    const rows = await new Promise((resolve, reject) => {
      db.all("SELECT * FROM qa_pairs", (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    const questions = rows.map(row => row.question);
    const matches = stringSimilarity.findBestMatch(message, questions);
  
    if (matches.bestMatch.rating > 0.6) {
      const bestMatchIndex = matches.bestMatchIndex;
      return res.json({ 
        response: rows[bestMatchIndex].answer,
        understood: true
      });
    }

    const associations = await new Promise((resolve, reject) => {
      db.all("SELECT * FROM question_associations", (err, associations) => {
        if (err) reject(err);
        else resolve(associations);
      });
    });

    if (associations.length > 0) {
      const questions_associated = associations.map(assoc => assoc.original_question);
      const matches_associated = stringSimilarity.findBestMatch(message, questions_associated);
      
      if (matches_associated.bestMatch.rating > 0.6) {
        const bestMatchIndex = matches_associated.bestMatchIndex;
        const associatedQuestion = associations[bestMatchIndex].associated_question;
        const question = rows.find(r => r.question === associatedQuestion);
        
        if (question) {
          return res.json({ 
            response: question.answer,
            understood: true
          });
        }
      }
    }

    const topMatches = matches.ratings
      .sort((a, b) => b.rating - a.rating)
      .filter((match, index, self) => 
        index === self.findIndex((t) => t.target === match.target)
      )
      .slice(0, 5)
      .map(match => ({
        question: match.target,
        rating: match.rating
      }));

    const selectedMatches = topMatches.slice(0, 3);
    
    res.json({ 
      response: "No estoy seguro de entender tu pregunta. ¿Te refieres a alguna de estas?",
      understood: false,
      possibleQuestions: selectedMatches,
      associatedQuestions: associations
    });

  } catch (error) {
    console.error('Error en el procesamiento del mensaje:', error);
    res.status(500).json({ error: "Error de servidor" });
  }
});


app.post('/select_suggested_question', verifyApiKey, (req, res) => {
  const { originalMessage, selectedQuestion } = req.body;

  // Primero, obtenemos la respuesta asociada con la pregunta seleccionada
  db.get("SELECT answer FROM qa_pairs WHERE question = ?", [selectedQuestion], (err, row) => {
    if (err) {
      console.error('Error al obtener la respuesta de la pregunta seleccionada:', err.message);
      return res.status(500).json({ error: "Error de servidor" });
    }

    if (!row) {
      return res.status(404).json({ error: "Pregunta no encontrada" });
    }

    const selectedAnswer = row.answer;

    // Incrementar el rating de coincidencia para la pregunta seleccionada
    db.run(`
      INSERT OR IGNORE INTO question_associations (original_question, associated_question)
      VALUES (?, ?);

      UPDATE question_associations
      SET count = count + 1
      WHERE original_question = ? AND associated_question = ?
    `, [originalMessage, selectedQuestion], function(err) {
      if (err) {
        console.error('Error al actualizar la coincidencia de pregunta:', err.message);
        return res.status(500).json({ error: "Error de servidor" });
      }

      // Responder al usuario con la respuesta seleccionada
      res.json({ response: selectedAnswer, understood: true });
    });
  });
});

// Ruta para agregar una nueva asociación de pregunta
app.post('/add_question_association', verifyApiKey, (req, res) => {
  const { originalQuestion, associatedQuestion } = req.body;
  db.run(`
    INSERT INTO question_associations (original_question, associated_question) 
    VALUES (?, ?)
    ON CONFLICT(original_question, associated_question) DO UPDATE SET ...`, 
    [originalQuestion, associatedQuestion],
    function(err) {
      if (err) {
        console.error('Error al insertar o actualizar asociación de pregunta:', err.message);
        return res.status(500).json({ error: "Error de servidor" });
      }
      res.json({ id: this.lastID });
    }
  );
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