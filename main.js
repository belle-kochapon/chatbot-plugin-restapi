// This script handles the entire chatbot user interface and functionality.

// Use a DOMContentLoaded listener to ensure the script runs after the page is fully loaded.
document.addEventListener('DOMContentLoaded', () => {
    // Define the new REST API endpoint URL.
    const apiUrl = '/wp-json/chatbot/v1/message';

    // Dynamically create and inject the Tailwind CSS script tag to ensure styles are available.
    const tailwindScript = document.createElement('script');
    tailwindScript.src = "https://cdn.tailwindcss.com";
    document.head.appendChild(tailwindScript);

    // This class handles the entire chatbot user interface and functionality.
    class ChatbotUI {
        constructor() {
            // Dynamically create the main container and append it to the body
            this.root = document.createElement('div');
            this.root.id = 'chatbot-container';
            this.root.className = 'relative z-50';
            document.body.appendChild(this.root);

            this.renderToggle();
            this.renderChatWindow();

            // Get references to DOM Elements after they have been rendered
            this.chatWindow = document.getElementById('chat-window');
            this.messageContainer = this.chatWindow.querySelector('.overflow-y-auto');
            this.messageInput = this.chatWindow.querySelector('textarea');
            this.sendButton = this.chatWindow.querySelector('.send-button');
            this.isProcessing = false; // Prevents multiple messages being sent at once

            // Event Listeners
            this.setupToggleListener();

            // Welcome message
            this.renderMessage('Hello! How can I help you today?', 'bot');
        }

        // Chat Toggle
        renderToggle() {
            const toggleHTML = `
                <button id="chat-toggle" class="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-full shadow-lg hover:bg-indigo-700 transition fixed bottom-6 right-6 z-50 text-base">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 0 1-.923 1.785A5.969 5.969 0 0 0 6 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337Z" /> 
                    </svg> Chat
                </button>
            `;
            this.root.insertAdjacentHTML('beforeend', toggleHTML);
        }

        // Chat Window
        renderChatWindow() {
            const chatHTML = `
                <div id="chat-window" class="hidden fixed bottom-20 right-6 w-80 h-96 bg-white border border-gray-300 shadow-lg rounded-lg flex flex-col z-50 text-base">
                    <div class="bg-indigo-600 text-white px-4 py-2 rounded-t-lg flex justify-between items-center">
                        <span>Chat with us</span>
                        <button id="chat-close" aria-label="Close chat">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                    <div class="flex-1 p-3 overflow-y-auto space-y-2">
                        </div>
                    <div class="p-3 border-t border-gray-200">
                        <div class="flex items-center gap-2">
                            <textarea
                                id="chat-input"
                                rows="1"
                                placeholder="Type a message..."
                                class="flex-1 resize-none border rounded px-2 py-1 focus:outline-none overflow-hidden"
                            ></textarea>
                            <button id="chat-send" class="send-button text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6">
                                    <path stroke-linecap="round" stroke-linejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            `;
            this.root.insertAdjacentHTML('beforeend', chatHTML);
        }

        // Conversation Window
        renderMessage(text, sender, isError = false) {
            const isUser = sender === 'user';
            const messageClass = isError ? 'bg-red-400 text-white self-start' : (isUser ? 'bg-indigo-600 text-white self-end' : 'bg-gray-200 text-gray-800 self-start');
            const messageHTML = `
                <div class="flex ${isUser ? 'justify-end' : 'justify-start'}">
                    <div class="rounded-xl px-4 py-2 max-w-[80%] ${messageClass} break-words">
                        ${text}
                    </div>
                </div>
            `;
            this.messageContainer.insertAdjacentHTML('beforeend', messageHTML);
            // Automatically scroll to the bottom of the chat window
            this.messageContainer.scrollTop = this.messageContainer.scrollHeight;

            // To allow the element to be removed later
            return this.messageContainer.lastElementChild;
        }

        // Open/Close Chat Window
        setupToggleListener() {
            const toggleButton = document.getElementById('chat-toggle');
            const closeButton = document.getElementById('chat-close');

            toggleButton.addEventListener('click', () => {
                this.chatWindow.classList.toggle('hidden');
            });

            // Close chat window when the close button is clicked
            closeButton.addEventListener('click', () => {
                this.chatWindow.classList.add('hidden');
            });

            // Send message on Enter key press
            this.messageInput.addEventListener('keydown', (event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    this.handleSendMessage();
                }
            });

            // Send message on button click
            this.sendButton.addEventListener('click', () => {
                this.handleSendMessage();
            });
        }

        // Handles sending a message from user and bot
        async handleSendMessage() {
            const userMessage = this.messageInput.value.trim();
            if (userMessage && !this.isProcessing) {
                // User's message
                this.renderMessage(userMessage, 'user');
                this.messageInput.value = '';
                this.messageInput.style.height = 'auto'; // Reset the textarea height

                // Loading message
                this.setLoadingState(true);

                // Error handling
                try {
                    const botResponse = await this.fetchBotResponse(userMessage);
                    // Remove the loading message and display the actual bot response.
                    // The API response is nested under a 'data' object.
                    this.renderMessage(botResponse.reply, 'bot');
                } catch (error) {
                    console.error('API call failed:', error);
                    this.renderMessage('Sorry, I am unable to respond right now.', 'bot', true);
                } finally {
                    this.setLoadingState(false);
                }
            }
        }

        // A function to call the custom WordPress REST API endpoint.
        async fetchBotResponse(userMessage) {
            try {
                const response = await fetch(apiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ message: userMessage })
                });

                const data = await response.json();

                if (!response.ok || !data.success) {
                    throw new Error(data.data || 'Failed to get response from server.');
                }
                
                // data.data is the response from n8n, as structured by our PHP handler.
                return data.data;

            } catch (err) {
                console.error('Error fetching bot response:', err);
                throw err;
            }
        }

        setLoadingState(isLoading) {
            this.isProcessing = isLoading;
            this.messageInput.disabled = isLoading;
            this.sendButton.disabled = isLoading;

            const sendButtonHTML = isLoading ?
                '<svg class="animate-spin h-6 w-6 text-gray-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>' :
                '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6"><path stroke-linecap="round" stroke-linejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" /></svg>';

            this.sendButton.innerHTML = sendButtonHTML;
        }
    }

    // Initialise the chatbot UI
    new ChatbotUI();
});