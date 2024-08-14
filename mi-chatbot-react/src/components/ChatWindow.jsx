import React, { useState, useRef, useEffect } from 'react';
import { processMessage, addQAPair, selectSuggestedQuestion } from '../utils/ChatLogic';

function ChatWindow() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isAddingQA, setIsAddingQA] = useState(false);
  const [newQuestion, setNewQuestion] = useState('');
  const [newAnswer, setNewAnswer] = useState('');
  const [possibleQuestions, setPossibleQuestions] = useState([]);
  const [originalQuestion, setOriginalQuestion] = useState('');
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }

  useEffect(scrollToBottom, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (input.trim()) {
      setMessages(prev => [...prev, { text: input, sender: 'user' }]);
      setOriginalQuestion(input);
      setInput('');
      try {
        const response = await processMessage(input);
        console.log('Respuesta del servidor:', response);  // Log de la respuesta del servidor
        if (response.understood) {
          setMessages(prev => [...prev, { text: response.response, sender: 'bot' }]);
        } else {
          setMessages(prev => [...prev, { text: response.response, sender: 'bot' }]);
          setPossibleQuestions(response.possibleQuestions || []);
        }
      } catch (error) {
        console.error('Error al procesar el mensaje:', error);
        setMessages(prev => [...prev, { text: "Lo siento, ha ocurrido un error.", sender: 'bot' }]);
      }
    }
  };

  const handleSelectQuestion = async (selectedQuestion) => {
    setMessages(prev => [...prev, { text: selectedQuestion, sender: 'user' }]);
  
    try {
      const response = await selectSuggestedQuestion(originalQuestion, selectedQuestion);
  
      if (response.understood) {
        setMessages(prev => [...prev, { text: response.response, sender: 'bot' }]);
      } else {
        setMessages(prev => [...prev, { text: "Lo siento, no entiendo la pregunta.", sender: 'bot' }]);
      }
  
      // Limpiar las preguntas posibles y la pregunta original
      setPossibleQuestions([]);
      setOriginalQuestion('');
    } catch (error) {
      console.error('Error al seleccionar la pregunta sugerida:', error);
      setMessages(prev => [...prev, { text: "Lo siento, ha ocurrido un error.", sender: 'bot' }]);
    }
  };

  const handleNoneOfAbove = async () => {
    setMessages(prev => [...prev, { text: "Ninguna de las anteriores se ajusta a mi pregunta.", sender: 'user' }]);
    try {
      const response = await processMessage(originalQuestion);
      if (response.understood) {
        setMessages(prev => [...prev, { text: response.response, sender: 'bot' }]);
        setPossibleQuestions([]);
      } else {
        setMessages(prev => [...prev, { text: "Entiendo. Permíteme buscar otras opciones.", sender: 'bot' }]);
        setPossibleQuestions(response.possibleQuestions || []);
      }
    } catch (error) {
      console.error('Error al procesar la pregunta original:', error);
      setMessages(prev => [...prev, { text: "Lo siento, ha ocurrido un error.", sender: 'bot' }]);
    }
  };

  const handleAddQAPair = async (e) => {
    e.preventDefault();
    if (newQuestion.trim() && newAnswer.trim()) {
      try {
        await addQAPair(newQuestion, newAnswer);
        setMessages(prev => [...prev, { text: 'Nueva pregunta y respuesta añadidas con éxito.', sender: 'bot' }]);
        setNewQuestion('');
        setNewAnswer('');
        setIsAddingQA(false);
      } catch (error) {
        console.error('Error al añadir nueva pregunta y respuesta:', error);
        setMessages(prev => [...prev, { text: 'Error al añadir nueva pregunta y respuesta.', sender: 'bot' }]);
      }
    }
  };

  return (
    <div className="flex flex-col w-full max-w-md mx-auto h-[600px] bg-white rounded-lg shadow-2xl overflow-hidden">
      <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white p-4 text-center font-bold text-xl">
        Mi Chatbot 🤖
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-100">
        {messages.map((msg, index) => (
          <div key={index} className={`flex items-end space-x-2 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.sender === 'bot' && <span className="text-2xl">🤖</span>}
            <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
              msg.sender === 'user' ? 'bg-blue-500 text-white' : 'bg-white text-gray-800'
            } shadow-md`}>
              {msg.text}
            </div>
            {msg.sender === 'user' && <span className="text-2xl">👤</span>}
          </div>
        ))}
        {possibleQuestions.length > 0 && (
          <div className="space-y-2 bg-white p-4 rounded-lg shadow">
            <p className="font-semibold">¿Te refieres a alguna de estas preguntas?</p>
            {possibleQuestions.map((q, index) => (
              <button
                key={index}
                onClick={() => handleSelectQuestion(q.question)}
                className="block w-full text-left p-2 bg-gray-100 hover:bg-gray-200 rounded transition duration-150 ease-in-out"
              >
                {q.question}
              </button>
            ))}
            <button
              onClick={handleNoneOfAbove}
              className="block w-full text-left p-2 bg-red-100 hover:bg-red-200 rounded transition duration-150 ease-in-out"
            >
              Ninguna de las anteriores
            </button>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      {isAddingQA ? (
        <form onSubmit={handleAddQAPair} className="p-4 bg-gray-200 border-t">
          <input
            type="text"
            value={newQuestion}
            onChange={(e) => setNewQuestion(e.target.value)}
            placeholder="Nueva pregunta"
            className="w-full p-2 mb-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <input
            type="text"
            value={newAnswer}
            onChange={(e) => setNewAnswer(e.target.value)}
            placeholder="Nueva respuesta"
            className="w-full p-2 mb-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <div className="flex space-x-2">
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              Añadir
            </button>
            <button
              type="button"
              onClick={() => setIsAddingQA(false)}
              className="flex-1 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              Cancelar
            </button>
          </div>
        </form>
      ) : (
        <form onSubmit={handleSendMessage} className="p-4 bg-white border-t">
          <div className="flex space-x-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Escribe un mensaje..."
              className="flex-1 p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              Enviar
            </button>
          </div>
        </form>
      )}
      {!isAddingQA && (
        <button
          onClick={() => setIsAddingQA(true)}
          className="m-4 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          Añadir nueva pregunta y respuesta
        </button>
      )}
    </div>
  );
}

export default ChatWindow;