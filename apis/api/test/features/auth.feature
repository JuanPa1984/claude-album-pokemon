Feature: Trainer accounts
  As a Pokémon sticker collector
  I want to sign up and log in
  So that the app can remember which stickers I own

  Scenario: Registering a new trainer
    When I register with email "ash@example.com", username "ash" and password "pikachu123"
    Then the response status is 201
    And the response contains an access token for "ash"

  Scenario: An email can only be registered once
    Given a trainer "ash" with email "ash@example.com" and password "pikachu123" exists
    When I register with email "ash@example.com", username "ash2" and password "pikachu123"
    Then the response status is 409
    And the error message is "Email is already registered"

  Scenario: Logging in with valid credentials
    Given a trainer "misty" with email "misty@example.com" and password "starmie123" exists
    When I log in with email "MISTY@example.com" and password "starmie123"
    Then the response status is 200
    And the response contains an access token for "misty"

  Scenario: Logging in with a wrong password
    Given a trainer "brock" with email "brock@example.com" and password "onix12345" exists
    When I log in with email "brock@example.com" and password "wrong-password"
    Then the response status is 401

  Scenario Outline: Registration input is validated
    When I register with email "<email>", username "<username>" and password "<password>"
    Then the response status is 400

    Examples:
      | email            | username | password   |
      | not-an-email     | gary     | eevee12345 |
      | gary@example.com | ga       | eevee12345 |
      | gary@example.com | gary     | short      |
