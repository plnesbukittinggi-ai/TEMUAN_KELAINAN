
/**
 * Kompresi gambar menggunakan Canvas API
 * @param base64Str String Base64 sumber
 * @param maxWidth Lebar maksimal (default 1600px)
 * @param quality Kualitas JPEG (0.1 - 1.0, default 0.7)
 */
export const compressImage = async (base64Str: string, maxWidth = 1600, quality = 0.7): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      // Hitung rasio aspek jika gambar melebihi maxWidth
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Gagal mendapatkan context canvas'));
        return;
      }

      // Gambar ulang ke canvas dengan dimensi baru
      ctx.drawImage(img, 0, 0, width, height);

      // Export ke JPEG dengan kompresi kualitas
      // Base64 hasil kompresi biasanya < 500KB untuk 1600px
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = (err) => reject(err);
  });
};
