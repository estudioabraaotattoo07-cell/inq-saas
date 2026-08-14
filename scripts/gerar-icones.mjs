import sharp from "sharp";

const origem = "public/icone-ink-system.png";

const simboloRecortado = await sharp(origem).trim({ threshold: 10 }).toBuffer();

async function gerar(tamanho, destino) {
  const padding = Math.round(tamanho * 0.04);
  const areaSimbolo = tamanho - padding * 2;

  const simboloRedimensionado = await sharp(simboloRecortado)
    .resize(areaSimbolo, areaSimbolo, { fit: "inside", withoutEnlargement: false })
    .toBuffer();

  const meta = await sharp(simboloRedimensionado).metadata();
  const left = Math.round((tamanho - meta.width) / 2);
  const top = Math.round((tamanho - meta.height) / 2);

  await sharp({
    create: {
      width: tamanho,
      height: tamanho,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: simboloRedimensionado, left, top }])
    .png()
    .toFile(destino);

  console.log(`gerado: ${destino} (${tamanho}x${tamanho})`);
}

await gerar(512, "public/icone-ink-system-512.png");
await gerar(192, "public/icone-ink-system-192.png");
await gerar(180, "public/icone-ink-system-180.png");
