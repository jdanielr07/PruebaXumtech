import axios from 'axios';

const API_URL = 'http://localhost:3001';  // URL local del backend
const API_KEY = 'da6633a3-bc21-44f7-8344-985edc024fdb';  // Debe coincidir con la del backend

async function getResponses() {
  try {
    const response = await axios.get(`${API_URL}/responses`, {
      headers: { 'X-API-Key': API_KEY }
    });
    return response.data;
  } catch (error) {
    console.error('Error al obtener respuestas:', error);
    return [];
  }
}

export async function processMessage(message) {
  const responses = await getResponses();
  
  const matchingResponse = responses.find(r => 
    message.toLowerCase().includes(r.intent.toLowerCase())
  );
  
  if (matchingResponse) {
    return matchingResponse.response;
  }
  
  return "Lo siento, no entiendo esa pregunta. ¿Podrías reformularla?";
}