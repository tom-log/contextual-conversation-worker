document.getElementById("send").addEventListener("click", async () => {
  const input = document.getElementById("userInput");
  const chatHistory = document.getElementById("chatHistory");

  //verifica se já existe um sessionId armazenado no localStorage, se não, cria um novo
  let sessionId = localStorage.getItem("sessionId");
  if (!sessionId) {
    sessionId = Date.now().toString();
    localStorage.setItem("sessionId", sessionId);
  }

  addUserMessage(input.value, chatHistory);

  try {
    const response = await fetch("https://ai.wevertondevt.workers.dev", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      // sessionId no corpo da requisição
      body: JSON.stringify({ message: input.value, sessionId: sessionId }),
    });

    const data = await response.json(); // tentamos interpretar a resposta como JSON

    if (response.ok) {
      addBotMessage(data.response, chatHistory);
    } else {
      throw new Error(data.error || `HTTP error! status: ${response.status}`);
    }
  } catch (error) {
    console.error("Erro ao enviar mensagem:", error);
    addErrorMessage(`Erro ao enviar mensagem: ${error.message}`, chatHistory);
  }

  // limpa o campo de entrada e mantém o foco nele
  input.value = "";
  input.focus();
  // rola o histórico do chat para a mensagem mais recente
  chatHistory.scrollTop = chatHistory.scrollHeight;
});

document.getElementById("clear").addEventListener("click", async () => {
  // limpa o histórico no cliente
  document.getElementById("chatHistory").innerHTML = "";

  // limpa o contexto armazenado no servidor
  let sessionId = localStorage.getItem("sessionId");
  if (sessionId) {
    try {
      const response = await fetch(
        "https://ai.wevertondevt.workers.dev/clear",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ sessionId: sessionId }),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      console.log("Contexto limpo com sucesso.");
    } catch (error) {
      console.error("Erro ao limpar o contexto:", error);
    }
  }
});

function addUserMessage(message, container) {
  const messageDiv = document.createElement("div");
  messageDiv.textContent = `You: ${message}`;
  messageDiv.className = "user-message";
  container.appendChild(messageDiv);
}

function addBotMessage(message, container) {
  const messageDiv = document.createElement("div");
  messageDiv.textContent = `Chatbot: ${message}`;
  messageDiv.className = "bot-message";
  container.appendChild(messageDiv);
}

function addErrorMessage(message, container) {
  const messageDiv = document.createElement("div");
  messageDiv.textContent = message;
  messageDiv.className = "error-message";
  container.appendChild(messageDiv);
}
