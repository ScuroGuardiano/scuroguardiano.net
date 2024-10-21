import { HttpClient, HttpEvent, HttpEventType, HttpHeaders, HttpParams, HttpProgressEvent, HttpRequest, HttpUploadProgressEvent } from '@angular/common/http';
import { inject, Injectable, QueryList, signal } from '@angular/core';
import { firstValueFrom, last, map, Observable, of, Subject, tap, throwError } from 'rxjs';
import { IMAGE_CONVERSION_API } from 'src/env-var';
import ImageConversionRequest from '../types/image-conversion-request';

export interface ResponseWithProgress<T> {
  body$: Observable<T>;
  progress$: Observable<HttpProgressEvent>;
}

@Injectable({
  providedIn: 'root'
})
export class ImageConversionService {
  #httpClient = inject(HttpClient);
  #outputFormats?: string[];


  getOutputFormats(): Observable<string[]> {
    if (this.#outputFormats) {
      return of(this.#outputFormats);
    }

    return this.#httpClient.get<string[]>(`${IMAGE_CONVERSION_API}/convert`).pipe(
      tap(v => this.#outputFormats = v)
    );
  }

  convert(req: ImageConversionRequest): Observable<HttpEvent<Blob>> {
    const form = new FormData();
    form.set("file", req.file);

    let query = new HttpParams();
    query = query.set("w", req.width);
    query = query.set("h", req.height);
    query = query.set("f", req.format);

    if (req.quality != null) {
      query = query.set("q", req.quality);
    }

    const requestInit = new HttpRequest(
      "POST",
      `${IMAGE_CONVERSION_API}/convert`,
      form,
      { reportProgress: true, responseType: "blob", params: query }
    );

    return this.#httpClient.request<Blob>(requestInit);
  }
}
