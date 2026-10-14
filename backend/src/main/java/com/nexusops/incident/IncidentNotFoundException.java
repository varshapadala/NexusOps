package com.nexusops.incident;

public class IncidentNotFoundException extends RuntimeException {
    public IncidentNotFoundException(Long id) {
        super("Incident " + id + " was not found");
    }
}
