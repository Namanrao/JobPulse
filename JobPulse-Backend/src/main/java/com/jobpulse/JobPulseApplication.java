package com.jobpulse;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class JobPulseApplication {

    public static void main(String[] args) {
        SpringApplication.run(JobPulseApplication.class, args);
        System.out.println("JobPulse Application Started Successfully!");
        System.out.println("Access Swagger UI at: http://localhost:8080/swagger-ui.html");
    }
}