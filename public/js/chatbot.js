import { auth, db } from './firebase-config.js';
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

(() => {
  const chatbotButton = document.getElementById('chatbot-button');
  const chatbotWindow = document.getElementById('chatbot-window');
  const chatbotClose = document.getElementById('chatbot-close');
  const chatbotMessages = document.getElementById('chatbot-messages');
  const chatbotInput = document.getElementById('chatbot-input');
  const chatbotSendButton = document.getElementById('chatbot-send-button');

  let sessionId = null;
  let userRole = 'guest'; // default role

  async function fetchUserRole() {
    try {
      const user = auth.currentUser;
      if (user) {
        const userRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userRef);
        if (userDoc.exists()) {
          userRole = userDoc.data().role || 'guest';
        }
      }
    } catch (error) {
      console.error('Error fetching user role:', error);
    }
  }

  function addDefaultMessage() {
    addMessage("Hi, I am Divya, your Super Mall AI assistant. How can I help you today?", 'bot');
  }  

  function toggleChatWindow() {
    if (chatbotWindow.style.display === 'flex') {
      chatbotWindow.style.display = 'none';
    } else {
      chatbotWindow.style.display = 'flex';
      chatbotInput.focus();
      if (chatbotMessages.children.length === 0) {
        addDefaultMessage();
      }
    }
  }
  

  function addMessage(text, sender) {
    const messageElem = document.createElement('div');
    messageElem.classList.add('chatbot-message', sender);
    const messageText = document.createElement('div');
    messageText.classList.add('message-text');
    messageText.textContent = text;
    messageElem.appendChild(messageText);
    chatbotMessages.appendChild(messageElem);
    chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
  }

  async function sendMessage(message) {
    if (!message.trim()) return;
    addMessage(message, 'user');
    chatbotInput.value = '';
    chatbotSendButton.disabled = true;

    try {
      if (userRole === 'guest') {
        await fetchUserRole();
      }

      // Use full backend URL with port to avoid relative path issues
      const backendUrl = 'http://localhost:5001/api/dialogflow';

      const response = await fetch(backendUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, sessionId, userRole }),
      });

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('Unexpected response:', text);
        addMessage('Error communicating with assistant. Please try again later.', 'bot');
        chatbotSendButton.disabled = false;
        return;
      }

      const data = await response.json();
      if (data.sessionId) {
        sessionId = data.sessionId;
      }
      if (data.responseText) {
        addMessage(data.responseText, 'bot');
      } else {
        addMessage("Sorry, I didn't get that. Please try again.", 'bot');
      }
    } catch (error) {
      addMessage('Error communicating with assistant. Please try again later.', 'bot');
      console.error('Chatbot error:', error);
    } finally {
      chatbotSendButton.disabled = false;
    }
  }

  chatbotButton.addEventListener('click', toggleChatWindow);
  chatbotClose.addEventListener('click', () => {
    chatbotWindow.style.display = 'none';
  });

  chatbotInput.addEventListener('input', () => {
    chatbotSendButton.disabled = chatbotInput.value.trim() === '';
  });

  chatbotInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !chatbotSendButton.disabled) {
      e.preventDefault();
      sendMessage(chatbotInput.value);
    }
  });

  chatbotSendButton.addEventListener('click', () => {
    sendMessage(chatbotInput.value);
  });

  chatbotWindow.style.display = 'none';
})();
