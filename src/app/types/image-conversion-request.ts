export default class ImageConversionRequest {
  constructor(file: File, format: string, width = 0, height = 0, quality?: number) {
    this.file = file;
    this.format = format;
    this.width = width;
    this.height = height;
    this.quality = quality;
  }

  file: File;
  format: string;
  width: number;
  height: number;
  quality?: number;
}
