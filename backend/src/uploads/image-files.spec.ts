import { BadRequestException } from '@nestjs/common';
import { assertValidImage, detectImageExtension, MAX_IMAGE_BYTES } from './image-files';

const file = (buffer: Buffer, size = buffer.length) =>
  ({ buffer, size }) as unknown as Express.Multer.File;

describe('validación de imágenes subidas', () => {
  const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0]);
  const jpg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0]);
  const webp = Buffer.concat([
    Buffer.from('RIFF'),
    Buffer.from([0, 0, 0, 0]),
    Buffer.from('WEBPVP8 '),
  ]);

  it('reconoce JPG, PNG y WEBP por su firma', () => {
    expect(detectImageExtension(jpg)).toBe('jpg');
    expect(detectImageExtension(png)).toBe('png');
    expect(detectImageExtension(webp)).toBe('webp');
  });

  it('rechaza un archivo que no es imagen aunque diga serlo', () => {
    expect(() => assertValidImage(file(Buffer.from('<svg onload=alert(1)>')))).toThrow(
      /Formato no permitido/,
    );
  });

  it('rechaza archivos vacíos o de más de 5 MB', () => {
    expect(() => assertValidImage(undefined)).toThrow(BadRequestException);
    expect(() => assertValidImage(file(png, MAX_IMAGE_BYTES + 1))).toThrow(/5 MB/);
  });
});
