import { Component, computed, input } from '@angular/core';
import { bytesToHuman } from 'src/app/helpers/bytes-to-human';

@Component({
    selector: 'app-upload-progress',
    imports: [],
    templateUrl: './upload-progress.component.html',
    styleUrl: './upload-progress.component.scss'
})
export class UploadProgressComponent {
  total = input.required<number>();
  uploaded = input.required<number>();

  percentage = computed(() => Math.round(100 * this.uploaded() / this.total()));
  uploadCaption = computed(() => `${bytesToHuman(this.uploaded())} / ${bytesToHuman(this.total())} (${this.percentage()}%)`)
}
