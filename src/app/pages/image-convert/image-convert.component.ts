import { AsyncPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { translate, TranslocoPipe } from '@ngneat/transloco';
import { catchError, firstValueFrom, last, map, tap } from 'rxjs';
import { ImageConversionService } from 'src/app/services/image-conversion.service';
import { ImageUploadComponent } from "../../components/image-upload/image-upload.component";
import { FormsModule } from '@angular/forms';
import { ConvertFormComponent } from "../../components/convert-form/convert-form.component";
import ImageConversionRequest from 'src/app/types/image-conversion-request';
import { UploadProgressComponent } from "../../components/upload-progress/upload-progress.component";
import { HttpEventType, HttpProgressEvent } from '@angular/common/http';

@Component({
    selector: 'app-image-convert',
    imports: [
        AsyncPipe,
        TranslocoPipe,
        ImageUploadComponent,
        FormsModule,
        ConvertFormComponent,
        UploadProgressComponent,
    ],
    templateUrl: './image-convert.component.html',
    styleUrl: './image-convert.component.scss'
})
export default class ImageConvertComponent {
  #imageConversionService = inject(ImageConversionService);

  err = signal('');
  file = signal<File | null>(null);
  result = signal<Blob | null>(null);
  resultUrlObj = computed(() => this.result() ? URL.createObjectURL(this.result()!) : "");

  lastProgressEvent = signal<HttpProgressEvent | null>(null);
  progressTotal = computed(() => this.lastProgressEvent() ? this.lastProgressEvent()!.total : 0);
  progressDone = computed(() => this.lastProgressEvent() ? this.lastProgressEvent()!.loaded : 0);
  operationType = signal<'upload' | 'download' | 'idle'>('idle');
  operationCaption = computed(() => {
    if (this.operationType() === "upload") return translate("imageConvert.uploading");
    if (this.operationType() === "download") return translate("imageConvert.downloading");
    return "";
  });

  availableFormats$ = this.#imageConversionService.getOutputFormats().pipe(
    catchError((err) => {
      this.err.set(err.message ?? 'Unknown error');
      console.error(err);
      return [];
    })
  );

  setFile(file: File | null) {
    this.file.set(file);
  }

  changeImage() {
    this.file.set(null);
    this.result.set(null);
  }

  async convert(req: ImageConversionRequest) {
    try {
      const result = await firstValueFrom(
        this.#imageConversionService.convert(req).pipe(
          tap((event) => {
            if (event.type === HttpEventType.UploadProgress) {
              this.operationType.set('upload');
              this.lastProgressEvent.set(event);
            }

            if (event.type === HttpEventType.DownloadProgress) {
              this.operationType.set('download');
              this.lastProgressEvent.set(event);
            }
          }),
          last(),
          map((event) => {
            if (event.type === HttpEventType.Response) {
              return event.body;
            }
            throw new Error(`Unexpected event ${event}`);
          })
        )
      );

      this.result.set(result);
    }
    catch (err) {
      console.error(err);
    }
    finally {
      this.operationType.set('idle');
    }
  }
}
