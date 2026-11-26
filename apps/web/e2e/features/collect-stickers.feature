Feature: Collecting stickers
  As a trainer
  I want to mark the stickers I own
  So that I can track how complete my album is

  Background:
    Given I have registered as a new trainer

  Scenario: A new trainer is greeted in the header
    Then the header shows my trainer name

  Scenario: Marking a sticker as owned survives a reload
    Given I am on the album page "kanto"
    When I click the sticker "Pikachu"
    Then the sticker "Pikachu" is marked as owned
    When I reload the page
    Then the sticker "Pikachu" is marked as owned

  Scenario: Unmarking a sticker
    Given I am on the album page "kanto"
    And I click the sticker "Bulbasaur"
    When I click the sticker "Bulbasaur"
    Then the sticker "Bulbasaur" is not marked as owned
