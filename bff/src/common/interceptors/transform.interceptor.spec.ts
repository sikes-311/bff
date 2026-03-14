import { TransformInterceptor } from './transform.interceptor';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of } from 'rxjs';

describe('TransformInterceptor', () => {
  let interceptor: TransformInterceptor<unknown>;
  let mockExecutionContext: ExecutionContext;

  beforeEach(() => {
    interceptor = new TransformInterceptor();
    mockExecutionContext = {} as ExecutionContext;
  });

  it('正常系: レスポンスを { data, meta: { timestamp } } にラップする', (done) => {
    // Arrange
    const mockData = { id: '1', name: 'Alice' };
    const mockCallHandler: CallHandler = { handle: () => of(mockData) };

    // Act
    interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe((result) => {
      // Assert
      expect(result).toEqual({
        data: mockData,
        meta: expect.objectContaining({
          timestamp: expect.any(String),
        }),
      });
      done();
    });
  });

  it('正常系: 配列データもラップできる', (done) => {
    // Arrange
    const mockData = [{ id: '1' }, { id: '2' }];
    const mockCallHandler: CallHandler = { handle: () => of(mockData) };

    // Act
    interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe((result) => {
      // Assert
      expect(result.data).toEqual(mockData);
      done();
    });
  });
});
