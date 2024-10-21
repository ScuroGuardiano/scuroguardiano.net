import { Component, computed, EventEmitter, inject, input, Output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslocoPipe } from '@ngneat/transloco';
import { bytesToHuman } from 'src/app/helpers/bytes-to-human';
import { ImageConversionService } from 'src/app/services/image-conversion.service';
import ImageConversionRequest from 'src/app/types/image-conversion-request';

@Component({
  selector: 'app-convert-form',
  standalone: true,
  imports: [
    TranslocoPipe,
    FormsModule
  ],
  templateUrl: './convert-form.component.html',
  styleUrl: './convert-form.component.scss'
})
export class ConvertFormComponent {
  file = input.required<File>();
  availableFormats = input.required<string[]>();
  prieviewOnly = input(false);

  @Output() cancel = new EventEmitter<void>();
  @Output() convert = new EventEmitter<ImageConversionRequest>();

  size = computed(() => bytesToHuman(this.file()?.size ?? 0));
  urlObj = computed(() => this.file() ? URL.createObjectURL(this.file()!) : "");

  origWidth = signal(0);
  origHeight = signal(0);
  origAspect = computed(() => this.origWidth() / this.origHeight());
  format = signal("JPEG");
  disableQuality = computed(() => !["JPEG", "WEBP"].includes(this.format()));
  width = signal(0);
  height = signal(0);

  quality = "75";
  keepAspect = true;

  changeImage() {
    this.cancel.emit();
  }

  onImgLoad(img: HTMLImageElement) {
    this.origWidth.set(img.naturalWidth);
    this.origHeight.set(img.naturalHeight);
    this.width.set(img.naturalWidth);
    this.height.set(img.naturalHeight);
  }

  onChangeWidth(evt: Event) {
    const val = (evt.target as HTMLInputElement).valueAsNumber;
    this.width.set(val);

    if (this.keepAspect) {
      this.height.set(Math.round(val * (1 / this.origAspect())))
    }
  }

  onChangeHeight(evt: Event) {
    const val = (evt.target as HTMLInputElement).valueAsNumber;
    this.height.set(val);

    if (this.keepAspect) {
      this.width.set(Math.round(val * this.origAspect()));
    }
  }

  onChangeFormat(evt: Event) {
    this.format.set((evt.target as HTMLInputElement).value);
  }

  submit(event: SubmitEvent) {
    event.preventDefault();
    this.convert.emit(new ImageConversionRequest(
      this.file(),
      this.format(),
      this.width(),
      this.height(),
      this.qualityToNumber()
    ));
  }

  qualityToNumber() {
    const q = parseInt(this.quality);
    return isFinite(q) ? q : undefined;
  }
}
