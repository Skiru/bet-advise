export class Result<T> {
  private constructor(
    private readonly isSuccessVal: boolean,
    private readonly valueVal?: T,
    private readonly errorVal?: string,
  ) {}

  public static ok<U>(value?: U): Result<U> {
    return new Result<U>(true, value);
  }

  public static fail<U>(error: string): Result<U> {
    return new Result<U>(false, undefined, error);
  }

  get isSuccess(): boolean {
    return this.isSuccessVal;
  }

  get isFailure(): boolean {
    return !this.isSuccessVal;
  }

  getValue(): T {
    if (!this.isSuccessVal) {
      throw new Error('Cannot retrieve value from a failed result');
    }
    return this.valueVal as T;
  }

  getError(): string {
    if (this.isSuccessVal) {
      throw new Error('Cannot retrieve error from a successful result');
    }
    return this.errorVal as string;
  }
}
