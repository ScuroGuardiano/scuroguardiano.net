import { NgClass } from '@angular/common';
import { Component, computed, EventEmitter, Output, signal } from '@angular/core';
import { TranslocoPipe } from '@ngneat/transloco';

@Component({
    selector: 'app-image-upload',
    imports: [
        NgClass,
        TranslocoPipe
    ],
    templateUrl: './image-upload.component.html',
    styleUrl: './image-upload.component.scss'
})
export class ImageUploadComponent {

  dragCounter = signal(0);
  fileOver = computed(() => this.dragCounter() > 0);
  classes = computed(() => ({ "file-over": this.fileOver() }));

  @Output()
  file = new EventEmitter<File | null>;

  onDragEnter(event: DragEvent) {
    this.dragCounter.update(x => x + 1);
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
  }

  onDragLeave(event: DragEvent) {
    this.dragCounter.update(x => x - 1);
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.dragCounter.set(0);
    this.file.emit(event.dataTransfer?.files?.[0] ?? null);
  }

  onUpload(event: Event) {
    this.file.emit((event.target as HTMLInputElement).files?.item(0) ?? null);
  }
}
