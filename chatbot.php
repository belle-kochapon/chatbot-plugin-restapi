<?php
/**
 * Plugin Name: FAQ Chatbot
 * Description: A chatbot UI built with HTML,Tailwind CSS, and Javascript (OOP). The frontend JavaScript communicates with a custom REST API endpoint, which then acts as a proxy to the n8n webhook.
 * Version: 1.0
 * Author: Belle
 */

// Exit if accessed directly.
if (!defined('ABSPATH')) {
    exit;
}

// Enqueue the JavaScript file.
function chatbot_enqueue_assets() {
    wp_enqueue_script(
        'chatbot-main',
        plugins_url('main.js', __FILE__),
        array(),
        '1.2',
        true
    );
}
add_action('wp_enqueue_scripts', 'chatbot_enqueue_assets');

// Register a custom REST API endpoint for the chatbot.
function chatbot_register_api_endpoint() {
    register_rest_route('chatbot/v1', '/message', array(
        'methods' => 'POST',
        'callback' => 'chatbot_rest_api_handler',
        'permission_callback' => '__return_true', // Allows all users to access the endpoint
    ));
}
add_action('rest_api_init', 'chatbot_register_api_endpoint');

// Custom REST API handler for the chatbot.
// This function acts as a secure proxy to the n8n webhook.
function chatbot_rest_api_handler(WP_REST_Request $request) {
    // Sanitize and get the message from the request body.
    $message = sanitize_text_field($request->get_param('message'));

    if (empty($message)) {
        return new WP_REST_Response(array('success' => false, 'data' => 'Message is empty.'), 400);
    }

    // Define the URL for your n8n webhook.
    // In a production environment, you should load this from a constant or environment variable.
    $n8n_webhook_url = 'http://localhost:5678/webhook-test/28b4276d-b522-4b8b-a1d4-95ef6a255ece';

    // Forward the message to your n8n webhook.
    $response = wp_remote_post($n8n_webhook_url, array(
        'body' => json_encode(array('message' => $message)),
        'headers' => array('Content-Type' => 'application/json'),
        'timeout' => 30, // Set a reasonable timeout
    ));

    if (is_wp_error($response)) {
        return new WP_REST_Response(array('success' => false, 'data' => 'Failed to connect to the webhook.'), 500);
    }

    $body = wp_remote_retrieve_body($response);
    $data = json_decode($body, true);

    if ($data === null) {
        return new WP_REST_Response(array('success' => false, 'data' => 'Invalid response from webhook.'), 500);
    }

    return new WP_REST_Response(array('success' => true, 'data' => $data), 200);
}
