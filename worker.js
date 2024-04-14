import { Ai } from "./vendor/@cloudflare/ai.js";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    if (request.method === "OPTIONS") {
      // Tratamento padrão para requisições CORS preflight
      return handleCors(request);
    } else if (request.method === "POST" && path === "/clear") {
      // Trata a requisição de limpeza do contexto
      return clearContext(request, env);
    } else if (request.method === "POST") {
      // Processa mensagens de chat normais
      return handleChatbot(request, env);
    } else {
      // Resposta padrão para outros tipos de requisições
      return new Response("This worker responds to POST requests.", {
        headers: {
          "Content-Type": "text/plain",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }
  },
};

// Função para tratar requisições CORS preflight
function handleCors(request) {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

// Função que lida com a interação do bot
async function handleChatbot(request, env) {
  const ai = new Ai(env.AI);

  try {
    const { message, sessionId } = await request.json();

    let sessionData = await env.CHAT_CONTEXT.get(sessionId);
    let session = sessionData ? JSON.parse(sessionData) : { history: [] };

    if (!Array.isArray(session.history)) {
      session.history = [];
    }

    if (session.history.length === 0) {
      session.history.push({
        role: "system",
        content: "You are a helpful assistant.",
      });
    }

    session.history.push({ role: "user", content: message });

    const prompt = session.history
      .map((item) => `${item.role}: ${item.content}`)
      .join("\n");
    console.log("Sending to AI:", prompt);

    const aiResponse = await ai.run("@cf/meta/llama-2-7b-chat-int8", {
      prompt,
    });

    if (!aiResponse || typeof aiResponse.response === "undefined") {
      throw new Error("Unexpected AI response structure");
    }

    const botResponse = aiResponse.response.replace(/^bot:\s*/, "");

    session.history.push({ role: "bot", content: botResponse });

    await env.CHAT_CONTEXT.put(sessionId, JSON.stringify(session));

    return new Response(JSON.stringify({ response: botResponse }), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    console.error("Error handling chatbot:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }
}

// Função para lidar com a limpeza do contexto
async function clearContext(request, env) {
  try {
    const { sessionId } = await request.json();
    await env.CHAT_CONTEXT.delete(sessionId);
    return new Response(
      JSON.stringify({ message: "Contexto limpo com sucesso." }),
      {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  } catch (error) {
    console.error("Error clearing context:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }
}
