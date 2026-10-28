// AWS Lambda Handler: LambdaNotificaciones
// Activada por eventos de Amazon SQS (con reintento y cola DLQ de fallidos)
// Integra Amazon SES (correos) y Amazon SNS (SMS / Alertas)

exports.handler = async (event, context) => {
  console.log("LambdaNotificaciones invocada con evento SQS:", JSON.stringify(event));

  const records = event.Records || [];
  const results = [];

  for (const record of records) {
    try {
      const messageBody = JSON.parse(record.body);
      console.log(`Procesando mensaje SQS [${record.messageId}]:`, messageBody);

      const { user_email, title, message, type, phone } = messageBody;

      // 1. Enviar correo mediante Amazon SES si hay email
      if (user_email) {
        console.log(`[Amazon SES] Despachando correo a ${user_email}: [${title}] ${message}`);
        // En producción AWS: await ses.sendEmail(params).promise();
      }

      // 2. Enviar SMS o push mediante Amazon SNS si hay teléfono
      if (phone) {
        console.log(`[Amazon SNS] Enviando alerta SMS al número ${phone}: ${title}`);
        // En producción AWS: await sns.publish(params).promise();
      }

      results.push({ messageId: record.messageId, status: "PROCESSED" });
    } catch (err) {
      console.error(`Error al procesar mensaje SQS [${record.messageId}]:`, err.message);
      // Al arrojar el error, SQS reintenta según su Redrive Policy (hasta 3 intentos)
      // Si falla los 3 intentos, SQS lo deriva automáticamente a la "SQS cola de fallidos" (DLQ)
      throw err;
    }
  }

  return { statusCode: 200, body: JSON.stringify({ processedCount: results.length }) };
};
