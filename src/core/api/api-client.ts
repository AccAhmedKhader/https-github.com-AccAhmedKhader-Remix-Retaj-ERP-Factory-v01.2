export interface APIResponseEnvelope<T> {
  success: boolean;
  version: string; // e.g. "v1"
  data: T | null;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  pagination?: {
    currentPage: number;
    pageSize: number;
    totalPages: number;
    totalRecords: number;
  };
}

export class EnterpriseAPIClient {
  private static API_VERSION = "v1";

  /**
   * Encapsulates responses in a consistent corporate envelope.
   */
  public static wrapResponse<T>(
    data: T,
    page?: number,
    pageSize?: number,
    totalRecords?: number
  ): APIResponseEnvelope<T> {
    const envelope: APIResponseEnvelope<T> = {
      success: true,
      version: this.API_VERSION,
      data
    };

    if (page !== undefined && pageSize !== undefined && totalRecords !== undefined) {
      envelope.pagination = {
        currentPage: page,
        pageSize,
        totalPages: Math.ceil(totalRecords / pageSize),
        totalRecords
      };
    }

    return envelope;
  }

  /**
   * Uniform corporate error response formatting.
   */
  public static wrapError(
    code: string,
    message: string,
    details?: any
  ): APIResponseEnvelope<null> {
    return {
      success: false,
      version: this.API_VERSION,
      data: null,
      error: {
        code,
        message,
        details
      }
    };
  }
}
