import axios from 'axios';

const API_URL = 'http://localhost:3001';
const API_KEY = 'da6633a3-bc21-44f7-8344-985edc024fdb';

export async function processMessage(message) {
  try {
    const response = await axios.post(`${API_URL}/process_message`, 
      { message },
      { headers: { 'X-API-Key': API_KEY } }
    );
    console.log('Respuesta del servidor en processMessage:', response.data);  // Log de la respuesta
    return response.data;
  } catch (error) {
    console.error('Error al procesar el mensaje:', error);
    throw error;
  }
}

export async function addQAPair(question, answer) {
  try {
    const response = await axios.post(`${API_URL}/qa_pairs`, 
      { question, answer },
      { headers: { 'X-API-Key': API_KEY } }
    );
    return response.data;
  } catch (error) {
    console.error('Error al agregar nuevo par de pregunta y respuesta:', error);
    throw error;
  }
}

export async function selectSuggestedQuestion(originalMessage, selectedQuestion) {
  try {
    const response = await axios.post(`${API_URL}/select_suggested_question`, 
      { originalMessage, selectedQuestion }, 
      { headers: { 'X-API-Key': API_KEY } }
    );
    console.log('Respuesta del servidor en selectSuggestedQuestion:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error al seleccionar la pregunta sugerida:', error);
    throw error;
  }
}