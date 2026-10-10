export class AppError extends Error {
  constructor(public message: string, public code: string = 'INTERNAL_ERROR') {
    super(message);
    this.name = 'AppError';
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Not found') {
    super(message, 'NOT_FOUND');
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden') {
    super(message, 'FORBIDDEN');
  }
}
