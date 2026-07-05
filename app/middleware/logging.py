import logging
import time
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import Response

# Define logger
logger = logging.getLogger("homesync.access")
logging.basicConfig(level=logging.INFO)


class LoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        """
        Log request details, execution time, and response status codes.
        """
        start_time = time.time()
        client_host = request.client.host if request.client else "unknown"
        
        # Log request start
        logger.info(
            f"--> {request.method} {request.url.path} "
            f"Client: {client_host} User-Agent: {request.headers.get('user-agent', 'unknown')}"
        )
        
        try:
            response = await call_next(request)
            process_time = time.time() - start_time
            
            # Log response end
            logger.info(
                f"<-- {request.method} {request.url.path} "
                f"Status: {response.status_code} "
                f"Duration: {process_time:.4f}s"
            )
            return response
        except Exception as e:
            process_time = time.time() - start_time
            logger.error(
                f"X-- {request.method} {request.url.path} "
                f"Exception: {str(e)} "
                f"Duration: {process_time:.4f}s"
            )
            raise e
