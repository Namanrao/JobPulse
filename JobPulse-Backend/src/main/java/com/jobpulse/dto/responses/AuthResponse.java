package com.jobpulse.dto.responses;

import com.jobpulse.model.User;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AuthResponse {

    private boolean success;
    private String message;
    private String token;
    private String email;
    private String fullName;
    private User.UserRole role;

    public AuthResponse(boolean success, String message, String token, User user) {
        this.success = success;
        this.message = message;
        this.token = token;
        this.email = user.getEmail();
        this.fullName = user.getFullName();
        this.role = user.getRole();
    }

    public static AuthResponse success(String message, String token, User user) {
        return new AuthResponse(true, message, token, user);
    }

    public static AuthResponse error(String message) {
        AuthResponse response = new AuthResponse();
        response.setSuccess(false);
        response.setMessage(message);
        return response;
    }
}