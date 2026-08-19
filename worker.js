import { EmailMessage } from "cloudflare:email";

const REMETENTE = "guia@nutridudacamargo.com.br";
const DESTINO = "nutridudacamargo@gmail.com";

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === "/api/guia" && request.method === "POST") {
      return handleGuiaForm(request, env, url);
    }

    // Tudo o mais é servido normalmente pelos arquivos estáticos do site.
    return env.ASSETS.fetch(request);
  },
};

async function handleGuiaForm(request, env, url) {
  let form;
  try {
    form = await request.formData();
  } catch (e) {
    return Response.redirect(new URL("/guia-obrigado/?erro=1", url), 303);
  }

  const nome = String(form.get("nome") || "").trim();
  const whatsapp = String(form.get("whatsapp") || "").trim();
  const email = String(form.get("email") || "").trim();
  const cidade = String(form.get("cidade") || "").trim();
  const origem = String(form.get("origem") || "").trim();
  const contato = whatsapp || email;

  if (!nome || !contato) {
    return Response.redirect(new URL("/guia-obrigado/?erro=1", url), 303);
  }

  const dataHora = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });

  const corpo = [
    "Novo pedido do guia pelo site nutridudacamargo.com.br",
    "",
    `Nome: ${nome}`,
    whatsapp ? `WhatsApp: ${whatsapp}` : null,
    email ? `E-mail: ${email}` : null,
    cidade ? `Cidade: ${cidade}` : null,
    origem ? `Página de origem: ${origem}` : null,
    `Data/hora: ${dataHora}`,
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const raw =
      `From: Site Duda Camargo <${REMETENTE}>\r\n` +
      `To: ${DESTINO}\r\n` +
      `Subject: Novo pedido de guia — ${nome}\r\n` +
      `Content-Type: text/plain; charset="UTF-8"\r\n` +
      `MIME-Version: 1.0\r\n\r\n` +
      corpo;

    const message = new EmailMessage(REMETENTE, DESTINO, raw);
    await env.GUIA_EMAIL.send(message);
  } catch (err) {
    // Mesmo se o e-mail falhar, a pessoa não pode ficar sem o guia:
    // ela é redirecionada para a página de agradecimento com o link de download.
    return Response.redirect(new URL("/guia-obrigado/?erro=email", url), 303);
  }

  return Response.redirect(new URL("/guia-obrigado/", url), 303);
}
