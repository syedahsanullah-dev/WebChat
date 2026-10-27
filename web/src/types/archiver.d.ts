declare module 'archiver' {
  import { Stream } from 'stream';

  interface ArchiverOptions {
    zlib?: {
      level?: number;
      [key: string]: any;
    };
    [key: string]: any;
  }

  interface Archiver extends Stream {
    append(source: string | Buffer | Stream, data: { name: string; [key: string]: any }): this;
    file(source: string, data: { name: string; [key: string]: any }): this;
    directory(dirpath: string, destpath: string | false, data?: any): this;
    finalize(): Promise<void>;
    pipe<T extends NodeJS.WritableStream>(destination: T, options?: { end?: boolean }): T;
    on(event: string, listener: (...args: any[]) => void): this;
    pointer(): number;
  }

  function archiver(format: string, options?: ArchiverOptions): Archiver;

  export = archiver;
}
