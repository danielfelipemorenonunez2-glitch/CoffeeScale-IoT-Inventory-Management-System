async function enviarEmail(orden) {
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;
  const dest = process.env.EMAIL_DEST || 'gerente@andinaroasters.com';

  if (!user || !pass) {
    console.log(`[EMAIL] 📧 Demo → Orden ${orden.ordenId?.slice(0,8)} | Tienda ${orden.tiendaId} | CONFIRMADA`);
    return;
  }
  try {
    const nodemailer  = require('nodemailer');
    const transporter = nodemailer.createTransport({ service:'gmail', auth:{user, pass} });
    await transporter.sendMail({
      from: user, to: dest,
      subject: `☕ [CoffeeScale] Orden generada – ${orden.tiendaId}`,
      html: `<h2>Orden de Reposición Automática</h2>
             <p><b>Tienda:</b> ${orden.tiendaId}</p>
             <p><b>Báscula:</b> ${orden.deviceId}</p>
             <p><b>Peso:</b> ${orden.pesoActual}g</p>
             <p><b>Estado:</b> ✅ CONFIRMADA</p>
             <p><b>Orden ID:</b> ${orden.ordenId}</p>`
    });
    console.log(`[EMAIL] ✅ Enviado a ${dest}`);
  } catch (e) {
    console.error('[EMAIL] Error:', e.message);
  }
}

module.exports = { enviarEmail };
