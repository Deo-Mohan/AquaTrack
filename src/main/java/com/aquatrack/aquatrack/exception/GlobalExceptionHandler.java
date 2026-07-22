package com.aquatrack.aquatrack.exception;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;

import java.util.HashMap;
import java.util.Map;

@ControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, String>> handleAllExceptions(Exception ex) {
        Map<String, String> errorResponse = new HashMap<>();
        errorResponse.put("error", "An internal server error occurred.");
        errorResponse.put("message", "The system encountered an error processing your request. Please contact support if the issue persists.");
        
        // Log the actual error internally (on the server side) for debug reasons
        System.err.println("[AquaTrack Error] System Exception caught: " + ex.getMessage());
        ex.printStackTrace();

        return ResponseEntity.status(500).body(errorResponse);
    }
}
